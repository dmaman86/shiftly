import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type SessionTokens } from "@/services/api/client";

const API = "https://api.example";
const SHIFTS = "/me/months/2026/9/shifts";

type Sent = {
  url: string;
  method: string | undefined;
  authorization: string | undefined;
  data: unknown;
  withCredentials: boolean | undefined;
  timeout: number | undefined;
};

type Reply = { status: number; data?: unknown } | { fail: AxiosError["code"] };

/** A fake transport: the real interceptors run, only the network is replaced. */
const transport = (reply: (sent: Sent, index: number) => Reply) => {
  const sent: Sent[] = [];
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const request: Sent = {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      authorization: config.headers.get("Authorization") as string | undefined,
      data: config.data ? JSON.parse(String(config.data)) : undefined,
      withCredentials: config.withCredentials,
      timeout: config.timeout,
    };
    sent.push(request);
    const outcome = reply(request, sent.length - 1);
    if ("fail" in outcome) {
      throw new AxiosError("failed", outcome.fail, config);
    }
    const response: AxiosResponse = {
      status: outcome.status,
      statusText: "",
      headers: {},
      config,
      data: outcome.data ?? "",
    };
    if (outcome.status >= 400) {
      throw new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        config,
        null,
        response,
      );
    }
    return response;
  });
  return { adapter, sent };
};

const tokensOf = (
  current: string | null,
  refreshed: () => Promise<string | null> = async () => null,
) => ({
  current: vi.fn<SessionTokens["current"]>(async () => current),
  refreshed: vi.fn<SessionTokens["refreshed"]>(refreshed),
});

const unauthenticated = {
  status: 401,
  data: { error: { code: "unauthenticated" } },
};

/** 401 for any token except the accepted one. */
const acceptingOnly =
  (token: string, data: unknown = { shifts: [] }) =>
  (sent: Sent): Reply =>
    sent.authorization === `Bearer ${token}`
      ? { status: 200, data }
      : unauthenticated;

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", `${API}/`);
  });

  describe("authenticated requests", () => {
    it("send the session token as a Bearer header, without cookies, with a timeout", async () => {
      const { adapter, sent } = transport(() => ({
        status: 200,
        data: { config: null },
      }));
      const tokens = tokensOf("token-1");

      const result = await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: "/me/months/2026/9/config",
        authenticated: true,
      });

      expect(result).toEqual({ data: { config: null } });
      expect(sent).toEqual([
        {
          url: `${API}/me/months/2026/9/config`,
          method: "get",
          authorization: "Bearer token-1",
          data: undefined,
          withCredentials: false,
          timeout: 10_000,
        },
      ]);
      expect(tokens.refreshed).not.toHaveBeenCalled();
    });

    it("send the body as JSON", async () => {
      const { adapter, sent } = transport(() => ({ status: 204 }));
      await createApiClient(tokensOf("token-1"), { adapter }).request({
        method: "PUT",
        path: "/me/work-days/2026-09-01",
        body: { status: "sick" },
        authenticated: true,
      });
      expect(sent[0].data).toEqual({ status: "sick" });
    });

    it("return null for an empty 204 answer", async () => {
      const { adapter } = transport(() => ({ status: 204 }));
      expect(
        await createApiClient(tokensOf("token-1"), { adapter }).request({
          method: "DELETE",
          path: "/me/shifts/1",
          authenticated: true,
        }),
      ).toEqual({ data: null });
    });

    it("are never sent when signed out", async () => {
      const { adapter } = transport(() => ({ status: 200 }));

      const result = await createApiClient(tokensOf(null), {
        adapter,
      }).request({ method: "GET", path: SHIFTS, authenticated: true });

      expect(result).toEqual({ error: "unauthenticated" });
      expect(adapter).not.toHaveBeenCalled();
    });
  });

  describe("public requests", () => {
    it("carry no token and never read the session", async () => {
      const { adapter, sent } = transport(() => ({ status: 200, data: {} }));
      const tokens = tokensOf("token-1");

      await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: "/reference/timelines",
        authenticated: false,
      });

      expect(sent[0].authorization).toBeUndefined();
      expect(tokens.current).not.toHaveBeenCalled();
    });

    it("are not refreshed or retried on a 401", async () => {
      const { adapter } = transport(() => unauthenticated);
      const tokens = tokensOf("token-1", async () => "fresh");

      const result = await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: "/reference/timelines",
        authenticated: false,
      });

      expect(result).toEqual({ error: "unauthenticated" });
      expect(adapter).toHaveBeenCalledOnce();
      expect(tokens.refreshed).not.toHaveBeenCalled();
    });
  });

  describe("on a 401", () => {
    it("refresh the session once and retry once with the refreshed token", async () => {
      const { adapter, sent } = transport(acceptingOnly("fresh"));
      const tokens = tokensOf("expired", async () => "fresh");

      const result = await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
      });

      expect(result).toEqual({ data: { shifts: [] } });
      expect(tokens.refreshed).toHaveBeenCalledOnce();
      expect(sent.map((request) => request.authorization)).toEqual([
        "Bearer expired",
        "Bearer fresh",
      ]);
    });

    it("retry with the refreshed token even if the session still reports the old one", async () => {
      const { adapter, sent } = transport(acceptingOnly("fresh"));
      // current() keeps answering "expired": the retry must not ask it again.
      const tokens = tokensOf("expired", async () => "fresh");

      await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
      });

      expect(sent[1].authorization).toBe("Bearer fresh");
      expect(tokens.current).toHaveBeenCalledOnce();
    });

    it("share one refresh among concurrent requests, each retried once", async () => {
      const { adapter, sent } = transport(acceptingOnly("fresh"));
      let finishRefresh: (token: string) => void = () => {};
      const tokens = tokensOf(
        "expired",
        () => new Promise((resolve) => (finishRefresh = resolve)),
      );
      const client = createApiClient(tokens, { adapter });
      const call = () =>
        client.request({ method: "GET", path: SHIFTS, authenticated: true });

      const results = Promise.all([call(), call(), call()]);
      await vi.waitFor(() => expect(tokens.refreshed).toHaveBeenCalled());
      await vi.waitFor(() => expect(sent).toHaveLength(3));
      finishRefresh("fresh");

      expect(await results).toEqual([
        { data: { shifts: [] } },
        { data: { shifts: [] } },
        { data: { shifts: [] } },
      ]);
      expect(tokens.refreshed).toHaveBeenCalledOnce();
      expect(sent).toHaveLength(6);
      expect(sent.slice(3).map((request) => request.authorization)).toEqual([
        "Bearer fresh",
        "Bearer fresh",
        "Bearer fresh",
      ]);
    });

    it("never retry a second 401", async () => {
      const { adapter } = transport(() => unauthenticated);
      const tokens = tokensOf("expired", async () => "also-rejected");

      const result = await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
      });

      expect(result).toEqual({ error: "unauthenticated" });
      expect(adapter).toHaveBeenCalledTimes(2);
      expect(tokens.refreshed).toHaveBeenCalledOnce();
    });

    it.each([
      ["returns no session", async () => null],
      [
        "throws",
        async () => {
          throw new Error("refresh_token_not_found");
        },
      ],
    ])(
      "do not retry when the refresh %s",
      async (_, refreshed: () => Promise<string | null>) => {
        const { adapter } = transport(() => unauthenticated);

        const result = await createApiClient(tokensOf("expired", refreshed), {
          adapter,
        }).request({ method: "GET", path: SHIFTS, authenticated: true });

        expect(result).toEqual({ error: "unauthenticated" });
        expect(adapter).toHaveBeenCalledOnce();
      },
    );

    it("do not refresh for other errors", async () => {
      const { adapter } = transport(() => ({
        status: 404,
        data: { error: { code: "not_found" } },
      }));
      const tokens = tokensOf("token-1", async () => "fresh");

      const result = await createApiClient(tokens, { adapter }).request({
        method: "DELETE",
        path: "/me/shifts/1",
        authenticated: true,
      });

      expect(result).toEqual({ error: "not_found" });
      expect(tokens.refreshed).not.toHaveBeenCalled();
    });
  });

  describe("cancellation", () => {
    it("never sends an already cancelled request", async () => {
      const { adapter } = transport(() => ({ status: 200 }));
      const controller = new AbortController();
      controller.abort();

      const result = await createApiClient(tokensOf("token-1"), {
        adapter,
      }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
        signal: controller.signal,
      });

      expect(result).toEqual({ error: "aborted" });
      expect(adapter).not.toHaveBeenCalled();
    });

    it("does not retry a request cancelled while the session refreshes", async () => {
      const { adapter } = transport(acceptingOnly("fresh"));
      const controller = new AbortController();
      const tokens = tokensOf("expired", async () => {
        controller.abort();
        return "fresh";
      });

      const result = await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
        signal: controller.signal,
      });

      expect(result).toEqual({ error: "aborted" });
      expect(adapter).toHaveBeenCalledOnce();
    });
  });

  it.each<[Reply, string]>([
    [{ status: 503 }, "http_503"],
    [{ fail: "ECONNABORTED" }, "timeout"],
    [{ fail: "ERR_NETWORK" }, "network"],
  ])("reports %j as %s", async (reply, expected) => {
    const { adapter } = transport(() => reply);
    expect(
      await createApiClient(tokensOf("token-1"), { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
      }),
    ).toEqual({ error: expected });
  });

  it("is not configured without an API URL, and reads or sends nothing", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { adapter } = transport(() => ({ status: 200 }));
    const tokens = tokensOf("token-1");

    expect(
      await createApiClient(tokens, { adapter }).request({
        method: "GET",
        path: SHIFTS,
        authenticated: true,
      }),
    ).toEqual({ error: "api_not_configured" });
    expect(adapter).not.toHaveBeenCalled();
    expect(tokens.current).not.toHaveBeenCalled();
  });

  it("leaves the global axios instance without interceptors", () => {
    createApiClient(tokensOf("token-1"));
    const handlers = (
      axios.interceptors.request as unknown as { handlers: unknown[] }
    ).handlers.filter(Boolean);
    expect(handlers).toHaveLength(0);
  });
});

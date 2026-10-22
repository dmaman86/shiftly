import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
} from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type SessionTokens } from "@/services/api/client";

const API = "https://api.example";

const httpError = (status: number, data: unknown = {}) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });

const ok = (data: unknown, status = 200) => ({ status, data });

const tokensOf = (current: string | null, refreshed: string | null) => {
  const tokens = {
    current: vi.fn<SessionTokens["current"]>(async () => current),
    refreshed: vi.fn<SessionTokens["refreshed"]>(async () => refreshed),
  };
  return tokens;
};

const configOf = (call: unknown[]) => call[0] as AxiosRequestConfig;
const authorizationOf = (call: unknown[]) =>
  (configOf(call).headers as Record<string, string> | undefined)?.Authorization;

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_URL", `${API}/`);
  });

  it("sends the session token as a Bearer header, without cookies", async () => {
    const request = vi
      .spyOn(axios, "request")
      .mockResolvedValue(ok({ config: null }));
    const tokens = tokensOf("token-1", "token-2");

    const result = await createApiClient(tokens).request({
      method: "GET",
      path: "/me/months/2026/9/config",
      authenticated: true,
    });

    expect(result).toEqual({ data: { config: null } });
    expect(request).toHaveBeenCalledOnce();
    expect(configOf(request.mock.calls[0])).toMatchObject({
      url: `${API}/me/months/2026/9/config`,
      method: "GET",
      withCredentials: false,
      timeout: 10_000,
    });
    expect(authorizationOf(request.mock.calls[0])).toBe("Bearer token-1");
    expect(tokens.refreshed).not.toHaveBeenCalled();
  });

  it("sends the body as JSON data", async () => {
    const request = vi.spyOn(axios, "request").mockResolvedValue(ok(""));
    await createApiClient(tokensOf("token-1", null)).request({
      method: "PUT",
      path: "/me/work-days/2026-09-01",
      body: { status: "sick" },
      authenticated: true,
    });
    expect(configOf(request.mock.calls[0]).data).toEqual({ status: "sick" });
  });

  it("returns null for an empty 204 answer", async () => {
    vi.spyOn(axios, "request").mockResolvedValue(ok("", 204));
    expect(
      await createApiClient(tokensOf("token-1", null)).request({
        method: "DELETE",
        path: "/me/shifts/1",
        authenticated: true,
      }),
    ).toEqual({ data: null });
  });

  it("calls public endpoints without any token", async () => {
    const request = vi.spyOn(axios, "request").mockResolvedValue(ok({}));
    const tokens = tokensOf("token-1", "token-2");

    await createApiClient(tokens).request({
      method: "GET",
      path: "/reference/timelines",
      authenticated: false,
    });

    expect(authorizationOf(request.mock.calls[0])).toBeUndefined();
    expect(tokens.current).not.toHaveBeenCalled();
  });

  it("does not refresh or retry a public endpoint's 401", async () => {
    const request = vi
      .spyOn(axios, "request")
      .mockRejectedValue(
        httpError(401, { error: { code: "unauthenticated" } }),
      );
    const tokens = tokensOf("token-1", "token-2");

    const result = await createApiClient(tokens).request({
      method: "GET",
      path: "/reference/timelines",
      authenticated: false,
    });

    expect(result).toEqual({ error: "unauthenticated" });
    expect(request).toHaveBeenCalledOnce();
    expect(tokens.refreshed).not.toHaveBeenCalled();
  });

  it("makes no request when signed out", async () => {
    const request = vi.spyOn(axios, "request");

    const result = await createApiClient(tokensOf(null, null)).request({
      method: "GET",
      path: "/me/months/2026/9/shifts",
      authenticated: true,
    });

    expect(result).toEqual({ error: "unauthenticated" });
    expect(request).not.toHaveBeenCalled();
  });

  it("on a 401 refreshes the session once and retries once with the new token", async () => {
    const request = vi
      .spyOn(axios, "request")
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce(ok({ shifts: [] }));
    const tokens = tokensOf("expired", "fresh");

    const result = await createApiClient(tokens).request({
      method: "GET",
      path: "/me/months/2026/9/shifts",
      authenticated: true,
    });

    expect(result).toEqual({ data: { shifts: [] } });
    expect(tokens.refreshed).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(authorizationOf(request.mock.calls[0])).toBe("Bearer expired");
    expect(authorizationOf(request.mock.calls[1])).toBe("Bearer fresh");
  });

  it("never retries a second 401", async () => {
    const request = vi
      .spyOn(axios, "request")
      .mockRejectedValue(
        httpError(401, { error: { code: "unauthenticated" } }),
      );
    const tokens = tokensOf("expired", "also-rejected");

    const result = await createApiClient(tokens).request({
      method: "GET",
      path: "/me/months/2026/9/shifts",
      authenticated: true,
    });

    expect(result).toEqual({ error: "unauthenticated" });
    expect(request).toHaveBeenCalledTimes(2);
    expect(tokens.refreshed).toHaveBeenCalledOnce();
  });

  it("does not retry when the refresh fails", async () => {
    const request = vi
      .spyOn(axios, "request")
      .mockRejectedValue(httpError(401));
    const tokens = tokensOf("expired", null);

    const result = await createApiClient(tokens).request({
      method: "GET",
      path: "/me/months/2026/9/shifts",
      authenticated: true,
    });

    expect(result).toEqual({ error: "unauthenticated" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("does not refresh for errors other than 401", async () => {
    vi.spyOn(axios, "request").mockRejectedValue(
      httpError(404, { error: { code: "not_found" } }),
    );
    const tokens = tokensOf("token-1", "token-2");

    const result = await createApiClient(tokens).request({
      method: "DELETE",
      path: "/me/shifts/1",
      authenticated: true,
    });

    expect(result).toEqual({ error: "not_found" });
    expect(tokens.refreshed).not.toHaveBeenCalled();
  });

  it.each([
    [httpError(503), "http_503"],
    [new AxiosError("timeout", "ECONNABORTED"), "timeout"],
    [new AxiosError("Network Error", "ERR_NETWORK"), "network"],
  ])("reports %s as %s", async (error, expected) => {
    vi.spyOn(axios, "request").mockRejectedValue(error);
    expect(
      await createApiClient(tokensOf("token-1", null)).request({
        method: "GET",
        path: "/me/months/2026/9/shifts",
        authenticated: true,
      }),
    ).toEqual({ error: expected });
  });

  it("is not configured without an API URL, and calls nothing", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const request = vi.spyOn(axios, "request");
    const tokens = tokensOf("token-1", null);

    expect(
      await createApiClient(tokens).request({
        method: "GET",
        path: "/me/months/2026/9/shifts",
        authenticated: true,
      }),
    ).toEqual({ error: "api_not_configured" });
    expect(request).not.toHaveBeenCalled();
    expect(tokens.current).not.toHaveBeenCalled();
  });
});

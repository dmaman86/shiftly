import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  supabaseAccountDeleter,
  type AccountDeleter,
} from "../../src/user-data/account.ts";
import { UserDataError } from "../../src/user-data/errors.ts";
import {
  ADMIN_ID,
  ADMIN_TOKEN,
  FakeVerifier,
  USER_ID,
  USER_TOKEN,
} from "../auth/fakes.ts";
import { startUserDataApp } from "./harness.ts";

type App = Awaited<ReturnType<typeof startUserDataApp>>;
type ErrorBody = { error: { code: string; message: string } };
let app: App;

const start = async (verifier = new FakeVerifier()) => {
  const deleteUser = vi.fn<AccountDeleter["deleteUser"]>(async () => {});
  app = await startUserDataApp(undefined, {
    verifier,
    accounts: { deleteUser },
  });
  return { ...app, deleteUser, verifier };
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await app?.close();
  vi.restoreAllMocks();
});

describe("DELETE /me/account", () => {
  it("deletes the verified caller after revalidating the session", async () => {
    const { request, deleteUser, verifier } = await start();

    const response = await request("/me/account", {
      token: ADMIN_TOKEN,
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(verifier.revalidateCalls).toBe(1);
    expect(deleteUser).toHaveBeenCalledExactlyOnceWith(ADMIN_ID);
  });

  it("deletes the token's user, whatever the request names", async () => {
    const { request, deleteUser } = await start();

    await request(`/me/account?userId=${ADMIN_ID}`, {
      token: USER_TOKEN,
      method: "DELETE",
      body: { userId: ADMIN_ID, user_id: ADMIN_ID },
    });

    expect(deleteUser).toHaveBeenCalledExactlyOnceWith(USER_ID);
  });

  it("refuses a signed-out session even before its token expires", async () => {
    const verifier = new FakeVerifier();
    verifier.revokedSessions.add(USER_TOKEN);
    const { request, deleteUser } = await start(verifier);

    const response = await request("/me/account", {
      token: USER_TOKEN,
      method: "DELETE",
    });

    expect(response.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not delete when the Auth server cannot confirm the session", async () => {
    const verifier = new FakeVerifier();
    verifier.revalidateUnavailable = true;
    const { request, deleteUser } = await start(verifier);

    const response = await request("/me/account", {
      token: USER_TOKEN,
      method: "DELETE",
    });

    expect(response.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("requires a token", async () => {
    const { request, deleteUser, verifier } = await start();
    const response = await request("/me/account", { method: "DELETE" });
    expect(response.status).toBe(401);
    expect(verifier.revalidateCalls).toBe(0);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("answers a deletion failure with the API's error, not Supabase's", async () => {
    const { request, deleteUser } = await start();
    deleteUser.mockRejectedValueOnce(
      new UserDataError("data_unavailable", "Supabase Auth unavailable: boom"),
    );

    const response = await request("/me/account", {
      token: USER_TOKEN,
      method: "DELETE",
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("data_unavailable");
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});

describe("supabaseAccountDeleter", () => {
  const deleterAnswering = (status: number, body: unknown = {}) => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
    );
    const deleter = supabaseAccountDeleter({
      url: "https://project.supabase.co",
      secretKey: "sb_secret_test",
      fetch,
    });
    return { deleter, fetch };
  };

  it("deletes the user through the Auth admin API with the secret key", async () => {
    const { deleter, fetch } = deleterAnswering(200, { id: USER_ID });

    await deleter.deleteUser(USER_ID);

    const [input, init] = fetch.mock.calls[0];
    expect(String(input)).toBe(
      `https://project.supabase.co/auth/v1/admin/users/${USER_ID}`,
    );
    expect(init?.method).toBe("DELETE");
    expect(new Headers(init?.headers).get("apikey")).toBe("sb_secret_test");
  });

  it("treats a user that is already gone as deleted", async () => {
    const { deleter } = deleterAnswering(404, {
      code: "user_not_found",
      msg: "User not found",
    });
    await expect(deleter.deleteUser(USER_ID)).resolves.toBeUndefined();
  });

  it.each([
    [500, "data_unavailable"],
    [403, "internal_error"],
  ])("maps an Auth %i to %s", async (status, code) => {
    const { deleter } = deleterAnswering(status, { msg: "nope" });
    await expect(deleter.deleteUser(USER_ID)).rejects.toMatchObject({
      name: "UserDataError",
      code,
    });
  });
});

import {
  AuthApiError,
  AuthInvalidJwtError,
  AuthRetryableFetchError,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AuthUnavailableError } from "../../src/auth/ports.ts";
import { SupabaseAuthVerifier } from "../../src/auth/supabase-auth-verifier.ts";
import { USER_ID } from "./fakes.ts";

const TOKEN = "header.payload.signature";

const CLAIMS = {
  sub: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  is_anonymous: false,
};

function verifierWith(responses: { getClaims?: unknown; getUser?: unknown }) {
  const auth = {
    getClaims: vi.fn(async () => responses.getClaims),
    getUser: vi.fn(async () => responses.getUser),
  };
  const verifier = new SupabaseAuthVerifier({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
    auth: auth as unknown as ConstructorParameters<
      typeof SupabaseAuthVerifier
    >[0]["auth"],
  });
  return { verifier, auth };
}

const claims = (overrides: Record<string, unknown>) => ({
  data: { claims: { ...CLAIMS, ...overrides }, header: {}, signature: [] },
  error: null,
});

describe("SupabaseAuthVerifier.verify", () => {
  it("authenticates a signed-in user from the verified claims", async () => {
    const { verifier, auth } = verifierWith({ getClaims: claims({}) });
    expect(await verifier.verify(TOKEN)).toEqual({
      status: "authenticated",
      user: { userId: USER_ID, accessToken: TOKEN },
    });
    expect(auth.getClaims).toHaveBeenCalledWith(TOKEN);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("accepts an audience list that includes authenticated", async () => {
    const { verifier } = verifierWith({
      getClaims: claims({ aud: ["authenticated", "other"] }),
    });
    expect((await verifier.verify(TOKEN)).status).toBe("authenticated");
  });

  it.each([
    ["an anonymous user", { is_anonymous: true }],
    ["the anon role", { role: "anon" }],
    ["another audience", { aud: "other" }],
    ["no subject", { sub: "" }],
  ])("rejects a token of %s", async (_case, overrides) => {
    const { verifier } = verifierWith({ getClaims: claims(overrides) });
    expect((await verifier.verify(TOKEN)).status).toBe("rejected");
  });

  it("rejects a token the signature or expiry check refuses", async () => {
    const { verifier } = verifierWith({
      getClaims: {
        data: null,
        error: new AuthInvalidJwtError("JWT has expired"),
      },
    });
    expect(await verifier.verify(TOKEN)).toEqual({
      status: "rejected",
      reason: "JWT has expired",
    });
  });

  it("rejects a token the Auth server refuses", async () => {
    const { verifier } = verifierWith({
      getClaims: {
        data: null,
        error: new AuthApiError("invalid JWT", 403, "bad_jwt"),
      },
    });
    expect((await verifier.verify(TOKEN)).status).toBe("rejected");
  });

  it.each([
    ["a network failure", new AuthRetryableFetchError("fetch failed", 0)],
    ["a server error", new AuthApiError("internal", 500, "unexpected_failure")],
  ])("throws instead of deciding on %s", async (_case, error) => {
    const { verifier } = verifierWith({ getClaims: { data: null, error } });
    await expect(verifier.verify(TOKEN)).rejects.toThrow(AuthUnavailableError);
  });
});

describe("SupabaseAuthVerifier.revalidate", () => {
  const user = { userId: USER_ID, accessToken: TOKEN };

  it("confirms a session the Auth server still accepts", async () => {
    const { verifier, auth } = verifierWith({
      getUser: {
        data: { user: { id: USER_ID, is_anonymous: false } },
        error: null,
      },
    });
    expect(await verifier.revalidate(user)).toEqual({
      status: "authenticated",
      user,
    });
    expect(auth.getUser).toHaveBeenCalledWith(TOKEN);
  });

  it("rejects a session the Auth server no longer accepts", async () => {
    const { verifier } = verifierWith({
      getUser: {
        data: { user: null },
        error: new AuthApiError("Session not found", 403, "session_not_found"),
      },
    });
    expect((await verifier.revalidate(user)).status).toBe("rejected");
  });

  it("rejects a token that now belongs to another user", async () => {
    const { verifier } = verifierWith({
      getUser: { data: { user: { id: "someone-else" } }, error: null },
    });
    expect((await verifier.revalidate(user)).status).toBe("rejected");
  });

  it("throws when the Auth server cannot be reached", async () => {
    const { verifier } = verifierWith({
      getUser: {
        data: { user: null },
        error: new AuthRetryableFetchError("fetch failed", 0),
      },
    });
    await expect(verifier.revalidate(user)).rejects.toThrow(
      AuthUnavailableError,
    );
  });
});

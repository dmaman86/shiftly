import {
  createClient,
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  AuthUnavailableError,
  type AuthVerifier,
  type AuthenticatedUser,
  type Verification,
} from "./ports.ts";

type AuthClient = Pick<SupabaseClient["auth"], "getClaims" | "getUser">;

const AUTHENTICATED = "authenticated";

/**
 * Verifies Supabase Auth access tokens with the publishable key: proving
 * identity needs no privileges, so the secret key is never used here.
 *
 * getClaims verifies the signature locally when the project uses asymmetric
 * signing keys and asks the Auth server otherwise; both are correct.
 */
export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly auth: AuthClient;

  constructor(options: {
    url: string;
    publishableKey: string;
    /** Test seam: replaces the Supabase Auth client. */
    auth?: AuthClient;
  }) {
    this.auth =
      options.auth ??
      createClient(options.url, options.publishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }).auth;
  }

  async verify(accessToken: string): Promise<Verification> {
    const { data, error } = await this.auth.getClaims(accessToken);
    if (error) return rejectedOrThrow(error);
    if (!data) return { status: "rejected", reason: "no claims" };

    const { sub, aud, role, is_anonymous } = data.claims;
    const audiences = Array.isArray(aud) ? aud : [aud];
    if (typeof sub !== "string" || sub === "") {
      return { status: "rejected", reason: "token has no subject" };
    }
    if (!audiences.includes(AUTHENTICATED) || role !== AUTHENTICATED) {
      return {
        status: "rejected",
        reason: "token is not for an authenticated user",
      };
    }
    if (is_anonymous === true) {
      return { status: "rejected", reason: "anonymous users are not accepted" };
    }
    return { status: "authenticated", user: { userId: sub, accessToken } };
  }

  async revalidate(user: AuthenticatedUser): Promise<Verification> {
    const { data, error } = await this.auth.getUser(user.accessToken);
    if (error) return rejectedOrThrow(error);
    const current = data.user;
    if (!current || current.id !== user.userId) {
      return {
        status: "rejected",
        reason: "session no longer matches the user",
      };
    }
    if (current.is_anonymous === true) {
      return { status: "rejected", reason: "anonymous users are not accepted" };
    }
    return { status: "authenticated", user };
  }
}

/**
 * A token the Auth server or the signature check refuses is the caller's
 * problem (401). A network failure or a server error is ours: we cannot tell
 * whether the token is valid, so the request must not proceed (503).
 */
function rejectedOrThrow(error: AuthError): Verification {
  if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) {
    throw new AuthUnavailableError(
      `Supabase Auth unavailable: ${error.message}`,
    );
  }
  return { status: "rejected", reason: error.message };
}

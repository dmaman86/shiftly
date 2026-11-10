/**
 * Authentication and authorization are separate on purpose:
 * - AuthVerifier proves who the caller is (Supabase Auth).
 * - RoleRepository says what that caller may do (Shiftly roles).
 * Neither trusts anything the client says about roles.
 */

/** Elevated roles stored in app_user_roles. */
export type AppRole = "admin";

/** Every authenticated user is implicitly "user"; elevated roles add to it. */
export type EffectiveRole = "user" | AppRole;

export type AuthenticatedUser = {
  readonly userId: string;
  /** Kept only to revalidate the session; never logged or returned. */
  readonly accessToken: string;
};

/** Outcome of checking a token. Infrastructure failures throw instead. */
export type Verification =
  | { readonly status: "authenticated"; readonly user: AuthenticatedUser }
  | { readonly status: "rejected"; readonly reason: string };

export interface AuthVerifier {
  /**
   * Verifies the access token for ordinary requests: signature, expiry,
   * audience and role. Throws AuthUnavailableError when it cannot decide.
   */
  verify(accessToken: string): Promise<Verification>;
  /**
   * Asks the Auth server whether the user and session behind the token are
   * still valid, for privileged requests. Throws AuthUnavailableError when it
   * cannot decide.
   */
  revalidate(user: AuthenticatedUser): Promise<Verification>;
}

export interface RoleRepository {
  /** The user's elevated roles; throws AuthUnavailableError when unreadable. */
  rolesOf(userId: string): Promise<AppRole[]>;
}

/** Authentication or authorization could not be decided: fail closed. */
export class AuthUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthUnavailableError";
  }
}

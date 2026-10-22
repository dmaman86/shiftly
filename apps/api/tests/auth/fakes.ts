import {
  AuthUnavailableError,
  type AppRole,
  type AuthVerifier,
  type AuthenticatedUser,
  type RoleRepository,
  type Verification,
} from "../../src/auth/ports.ts";
import type { AppDeps } from "../../src/app.ts";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
export const USER_TOKEN = "user-token";
export const ADMIN_TOKEN = "admin-token";

/** Tokens it knows are valid; everything else is rejected. */
export class FakeVerifier implements AuthVerifier {
  readonly tokens = new Map<string, string>([
    [USER_TOKEN, USER_ID],
    [ADMIN_TOKEN, ADMIN_ID],
  ]);
  /** Sessions the Auth server no longer accepts (signed out, deleted user). */
  readonly revokedSessions = new Set<string>();
  verifyUnavailable = false;
  revalidateUnavailable = false;
  verifyCalls = 0;
  revalidateCalls = 0;

  async verify(accessToken: string): Promise<Verification> {
    this.verifyCalls++;
    if (this.verifyUnavailable) throw new AuthUnavailableError("auth down");
    const userId = this.tokens.get(accessToken);
    return userId
      ? { status: "authenticated", user: { userId, accessToken } }
      : { status: "rejected", reason: "invalid token" };
  }

  async revalidate(user: AuthenticatedUser): Promise<Verification> {
    this.revalidateCalls++;
    if (this.revalidateUnavailable) throw new AuthUnavailableError("auth down");
    return this.revokedSessions.has(user.accessToken)
      ? { status: "rejected", reason: "session revoked" }
      : { status: "authenticated", user };
  }
}

/** Role state that tests can change between requests. */
export class FakeRoles implements RoleRepository {
  readonly roles = new Map<string, AppRole[]>([[ADMIN_ID, ["admin"]]]);
  unavailable = false;

  async rolesOf(userId: string): Promise<AppRole[]> {
    if (this.unavailable) throw new AuthUnavailableError("roles down");
    return this.roles.get(userId) ?? [];
  }
}

/** For apps whose tests never reach user data: any use fails loudly. */
export const NO_USER_DATA: AppDeps["userData"] = {
  clientFor: () => {
    throw new Error("this test does not expect user-data access");
  },
};

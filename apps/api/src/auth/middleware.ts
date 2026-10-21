import type { RequestHandler, Response } from "express";
import {
  AuthUnavailableError,
  type AuthVerifier,
  type AuthenticatedUser,
  type EffectiveRole,
  type RoleRepository,
} from "./ports.ts";

const BEARER = /^Bearer ([^\s]+)$/;

type AuthLocals = { auth?: AuthenticatedUser };

/** The verified caller; only valid after requireAuth. */
export function authOf(res: Response): AuthenticatedUser {
  const auth = (res.locals as AuthLocals).auth;
  if (!auth) throw new Error("authOf used on a route without requireAuth");
  return auth;
}

/**
 * Authorization: Bearer <Supabase access token> → verified user in
 * res.locals. Missing, malformed, invalid, expired or anonymous → 401.
 */
export function requireAuth(verifier: AuthVerifier): RequestHandler {
  return async (req, res, next) => {
    const token = BEARER.exec(req.get("authorization") ?? "")?.[1];
    if (!token) {
      unauthenticated(res, "missing bearer token");
      return;
    }
    try {
      const verification = await verifier.verify(token);
      if (verification.status === "rejected") {
        unauthenticated(res, verification.reason);
        return;
      }
      (res.locals as AuthLocals).auth = verification.user;
      next();
    } catch (error) {
      unavailableOrThrow(res, error, "authentication_unavailable");
    }
  };
}

/**
 * For privileged routes, after requireAuth. Reads the role fresh on every
 * request (a revoked role fails on the next one), then revalidates the user
 * and session with the Auth server (a signed-out or deleted user fails even
 * if the token has not expired). Not admin → 403; cannot decide → 503.
 * Nothing the client sends about roles is read.
 */
export function requireAdmin(
  verifier: AuthVerifier,
  roles: RoleRepository,
): RequestHandler {
  return async (_req, res, next) => {
    const user = authOf(res);
    try {
      if (!(await roles.rolesOf(user.userId)).includes("admin")) {
        res.status(403).json({
          error: { code: "forbidden", message: "Admin role required" },
        });
        return;
      }
      const session = await verifier.revalidate(user);
      if (session.status === "rejected") {
        unauthenticated(res, session.reason);
        return;
      }
      next();
    } catch (error) {
      unavailableOrThrow(res, error, "authorization_unavailable");
    }
  };
}

/** GET /me: the caller's effective roles, for UI visibility only. */
export function meHandler(roles: RoleRepository): RequestHandler {
  return async (_req, res) => {
    const user = authOf(res);
    try {
      const effective: EffectiveRole[] = [
        "user",
        ...(await roles.rolesOf(user.userId)),
      ];
      res.json({ userId: user.userId, roles: effective });
    } catch (error) {
      unavailableOrThrow(res, error, "authorization_unavailable");
    }
  };
}

function unauthenticated(res: Response, reason: string): void {
  // The reason goes to the log, not the client: it would help probing.
  console.warn(
    JSON.stringify({ severity: "WARNING", event: "auth_rejected", reason }),
  );
  res
    .status(401)
    .set("WWW-Authenticate", "Bearer")
    .json({
      error: { code: "unauthenticated", message: "Authentication required" },
    });
}

function unavailableOrThrow(res: Response, error: unknown, code: string): void {
  if (!(error instanceof AuthUnavailableError)) throw error;
  console.error(
    JSON.stringify({ severity: "ERROR", event: code, message: error.message }),
  );
  res.status(503).json({
    error: { code, message: "Authorization could not be checked; try again" },
  });
}

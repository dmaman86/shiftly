import { Router } from "express";
import type { AuthVerifier } from "../auth/ports.ts";
import { authOf, requireFreshSession } from "../middleware/auth.ts";
import type { AccountDeleter } from "../repositories/account-deleter.ts";

/**
 * DELETE /me/account, under /me after requireAuth. Irreversible, so the
 * session is revalidated with the Auth server first: a token that was signed
 * out cannot delete the account. The user deleted is always the verified
 * caller. Errors are UserDataErrors, answered by handleUserDataErrors.
 */
export const accountRouter = (
  verifier: AuthVerifier,
  accounts: AccountDeleter,
): Router => {
  const router = Router();

  router.delete(
    "/account",
    requireFreshSession(verifier),
    async (_req, res) => {
      await accounts.deleteUser(authOf(res).userId);
      res.status(204).end();
    },
  );

  return router;
};

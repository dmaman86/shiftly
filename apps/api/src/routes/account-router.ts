import { Router } from "express";
import { accountController } from "../controllers/account-controller.ts";
import type { AuthVerifier } from "../ports/auth.ts";
import { requireFreshSession } from "../middleware/auth.ts";
import type { AccountDeleter } from "../repositories/account-deleter.ts";

/**
 * The caller's account, mounted under /me after requireAuth. Deleting is
 * irreversible, so the session is revalidated with the Auth server first: a
 * token that was signed out cannot delete the account.
 */
export const accountRouter = (
  verifier: AuthVerifier,
  accounts: AccountDeleter,
): Router => {
  const account = accountController(accounts);
  const router = Router();

  router.delete("/account", requireFreshSession(verifier), account.remove);

  return router;
};

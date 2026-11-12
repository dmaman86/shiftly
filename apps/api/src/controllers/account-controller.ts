import type { Request, Response } from "express";
import { authOf } from "../middleware/auth.ts";
import type { AccountDeleter } from "../repositories/account-deleter.ts";

/**
 * The caller's account, under /me after requireAuth. The user deleted is
 * always the verified caller. Errors are UserDataErrors, answered by
 * handleUserDataErrors.
 */
export const accountController = (accounts: AccountDeleter) => {
  /**
   * DELETE /me/account → 204. Irreversible: the router runs
   * requireFreshSession first, so a signed-out token cannot get here.
   */
  const remove = async (_req: Request, res: Response) => {
    await accounts.deleteUser(authOf(res).userId);
    res.status(204).end();
  };

  return { remove };
};

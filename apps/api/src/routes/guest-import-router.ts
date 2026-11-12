import { Router } from "express";
import { guestImportController } from "../controllers/guest-import-controller.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

/** Imports a guest's month for the caller, mounted under /me after requireAuth. */
export const guestImportRouter = (access: UserDataAccess): Router => {
  const guestImport = guestImportController(access);
  const router = Router();

  router.post("/months/:year/:month/guest-import", guestImport.importMonth);

  return router;
};

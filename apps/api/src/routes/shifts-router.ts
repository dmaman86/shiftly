import { Router } from "express";
import { shiftsController } from "../controllers/shifts-controller.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

/** The caller's shifts, mounted under /me after requireAuth. */
export const shiftsRouter = (access: UserDataAccess): Router => {
  const shifts = shiftsController(access);
  const router = Router();

  router.get("/months/:year/:month/shifts", shifts.listInMonth);
  router.put("/shifts/:id", shifts.save);
  router.delete("/shifts/:id", shifts.remove);

  return router;
};

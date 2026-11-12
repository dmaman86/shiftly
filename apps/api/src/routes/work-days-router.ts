import { Router } from "express";
import { workDaysController } from "../controllers/work-days-controller.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

/** The caller's day statuses, mounted under /me after requireAuth. */
export const workDaysRouter = (access: UserDataAccess): Router => {
  const workDays = workDaysController(access);
  const router = Router();

  router.get("/months/:year/:month/work-days", workDays.listInMonth);
  router.put("/work-days/:date", workDays.setStatus);

  return router;
};

import { Router } from "express";
import { monthlyConfigController } from "../controllers/monthly-config-controller.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

/** The caller's monthly settings, mounted under /me after requireAuth. */
export const monthlyConfigRouter = (access: UserDataAccess): Router => {
  const monthlyConfig = monthlyConfigController(access);
  const router = Router();

  router.get("/months/:year/:month/config", monthlyConfig.find);
  router.put("/months/:year/:month/config", monthlyConfig.saveSettings);
  router.put(
    "/months/:year/:month/shabbat-credit",
    monthlyConfig.saveShabbatCredit,
  );

  return router;
};

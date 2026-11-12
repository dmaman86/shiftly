import { Router } from "express";
import { z } from "zod";
import { authOf } from "../middleware/auth.ts";
import { monthlyConfigRepository } from "../repositories/monthly-config-repository.ts";
import { parseMonthPeriod, parseOrThrow } from "../services/month-period.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

/** Non-negative like the app's number inputs; z.number() rejects NaN and Infinity, so they never reach SQL. */
const amount = z.number().nonnegative();

/** Strict: a body with anything else, a user id included, is rejected. */
const settingsBody = z.strictObject({
  standardHours: amount,
  baseRate: amount,
});

const shabbatCreditBody = z.strictObject({ hours: amount });

/**
 * The caller's monthly settings, under /me after requireAuth. The owner is
 * always the verified token's user: no route reads a user id from the request.
 * Errors are UserDataErrors, answered by handleUserDataErrors.
 */
export const monthlyConfigRouter = (access: UserDataAccess): Router => {
  const router = Router();
  const repositoryFor = (res: Parameters<typeof authOf>[0]) =>
    monthlyConfigRepository(access.scopeFor(authOf(res)));

  // GET /me/months/:year/:month/config → { config } (null: never saved)
  router.get("/months/:year/:month/config", async (req, res) => {
    const period = parseMonthPeriod(req.params);
    const config = await repositoryFor(res).find(period);
    res.json({ config });
  });

  // PUT /me/months/:year/:month/config { standardHours, baseRate } → 204
  router.put("/months/:year/:month/config", async (req, res) => {
    const period = parseMonthPeriod(req.params);
    const settings = parseOrThrow(settingsBody, req.body);
    await repositoryFor(res).saveSettings(period, settings);
    res.status(204).end();
  });

  // PUT /me/months/:year/:month/shabbat-credit { hours } → 204
  router.put("/months/:year/:month/shabbat-credit", async (req, res) => {
    const period = parseMonthPeriod(req.params);
    const { hours } = parseOrThrow(shabbatCreditBody, req.body);
    await repositoryFor(res).saveShabbatCredit(period, hours);
    res.status(204).end();
  });

  return router;
};

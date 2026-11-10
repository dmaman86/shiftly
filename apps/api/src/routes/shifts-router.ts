import { Router } from "express";
import { z } from "zod";
import { authOf } from "../middleware/auth.ts";
import {
  calendarDate,
  parseMonthPeriod,
  parseOrThrow,
} from "../user-data/month-period.ts";
import { shiftsRepository } from "../repositories/shifts-repository.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";

const idParams = z.object({ id: z.uuid() });

const instant = z.iso.datetime({ offset: true });

/** Strict: a body with anything else, a user id included, is rejected. */
const shiftBody = z
  .strictObject({
    date: calendarDate,
    startTime: instant,
    endTime: instant,
    isDuty: z.boolean(),
  })
  .refine(
    ({ startTime, endTime }) => Date.parse(startTime) < Date.parse(endTime),
    { message: "A shift must end after it starts", path: ["endTime"] },
  );

/**
 * The caller's shifts, under /me after requireAuth. The owner is always the
 * verified token's user. Errors are UserDataErrors, answered by
 * handleUserDataErrors.
 */
export const shiftsRouter = (access: UserDataAccess): Router => {
  const router = Router();
  const repositoryFor = (res: Parameters<typeof authOf>[0]) =>
    shiftsRepository(access.scopeFor(authOf(res)));

  // GET /me/months/:year/:month/shifts → { shifts }
  router.get("/months/:year/:month/shifts", async (req, res) => {
    const period = parseMonthPeriod(req.params);
    const shifts = await repositoryFor(res).inMonth(period);
    res.json({ shifts });
  });

  // PUT /me/shifts/:id { date, startTime, endTime, isDuty } → 204, or 404
  // when the id is another user's (indistinguishable from a missing one).
  router.put("/shifts/:id", async (req, res) => {
    const { id } = parseOrThrow(idParams, req.params);
    const shift = parseOrThrow(shiftBody, req.body);
    await repositoryFor(res).save({ id, ...shift });
    res.status(204).end();
  });

  // DELETE /me/shifts/:id → 204, whether or not the caller had that shift.
  router.delete("/shifts/:id", async (req, res) => {
    const { id } = parseOrThrow(idParams, req.params);
    await repositoryFor(res).remove(id);
    res.status(204).end();
  });

  return router;
};

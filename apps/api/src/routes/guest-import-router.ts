import { Router } from "express";
import { z } from "zod";
import { authOf } from "../middleware/auth.ts";
import { guestImportRepository } from "../user-data/guest-import-repository.ts";
import {
  calendarDate,
  monthRange,
  parseMonthPeriod,
  parseOrThrow,
  type MonthPeriod,
} from "../user-data/month-period.ts";
import type { UserDataAccess } from "../user-data/user-scope.ts";

/** Same limits as api_import_guest_month and the browser's draft storage. */
const MAX_DAYS = 31;
const MAX_SHIFTS = 200;

const amount = z.number().finite().nonnegative();
const instant = z.iso.datetime({ offset: true });

const guestDay = z.strictObject({
  date: calendarDate,
  status: z.enum(["vacation", "sick"]),
});

const guestShift = z
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
 * Strict: a body with anything else, a user id or shift ids included, is
 * rejected. Every date must fall in the month of the path.
 */
const guestMonthBody = (period: MonthPeriod) => {
  const { start, end } = monthRange(period);
  const inMonth = (date: string) => date >= start && date < end;
  return z
    .strictObject({
      standardHours: amount,
      baseRate: amount,
      days: z.array(guestDay).max(MAX_DAYS),
      shifts: z.array(guestShift).max(MAX_SHIFTS),
    })
    .refine(
      ({ days, shifts }) =>
        days.every((day) => inMonth(day.date)) &&
        shifts.every((shift) => inMonth(shift.date)),
      { message: "Every date must be in the imported month" },
    );
};

/**
 * Imports a guest's month for the caller, under /me after requireAuth. The
 * owner is always the verified token's user. Errors are UserDataErrors,
 * answered by handleUserDataErrors.
 */
export const guestImportRouter = (access: UserDataAccess): Router => {
  const router = Router();

  // POST /me/months/:year/:month/guest-import
  //   { standardHours, baseRate, days, shifts } → 204
  // Replaces the month's days, shifts and settings; keeps the Shabbat credit.
  router.post("/months/:year/:month/guest-import", async (req, res) => {
    const period = parseMonthPeriod(req.params);
    const guest = parseOrThrow(guestMonthBody(period), req.body);
    await guestImportRepository(access.scopeFor(authOf(res))).importMonth(
      period,
      guest,
    );
    res.status(204).end();
  });

  return router;
};

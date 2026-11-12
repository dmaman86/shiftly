import type { Request, Response } from "express";
import { z } from "zod";
import { authOf } from "../middleware/auth.ts";
import {
  calendarDate,
  parseMonthPeriod,
  parseOrThrow,
} from "../services/month-period.ts";
import type { UserDataAccess } from "../repositories/user-scope.ts";
import {
  WORK_DAY_STATUSES,
  workDaysRepository,
} from "../repositories/work-days-repository.ts";

const dateParams = z.object({ date: calendarDate });

/** Strict: a body with anything else, a user id included, is rejected. */
const statusBody = z.strictObject({ status: z.enum(WORK_DAY_STATUSES) });

/**
 * The caller's day statuses, under /me after requireAuth. The owner is always
 * the verified token's user. Errors are UserDataErrors, answered by
 * handleUserDataErrors.
 */
export const workDaysController = (access: UserDataAccess) => {
  const repositoryFor = (res: Response) =>
    workDaysRepository(access.scopeFor(authOf(res)));

  /** GET /me/months/:year/:month/work-days → { workDays } (normal days omitted) */
  const listInMonth = async (req: Request, res: Response) => {
    const period = parseMonthPeriod(req.params);
    const workDays = await repositoryFor(res).inMonth(period);
    res.json({ workDays });
  };

  /** PUT /me/work-days/:date { status } → 204 ("normal" clears the day) */
  const setStatus = async (req: Request, res: Response) => {
    const { date } = parseOrThrow(dateParams, req.params);
    const { status } = parseOrThrow(statusBody, req.body);
    await repositoryFor(res).setStatus(date, status);
    res.status(204).end();
  };

  return { listInMonth, setStatus };
};

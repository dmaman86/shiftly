import { z } from "zod";
import { UserDataError } from "./errors.ts";

/**
 * Same bounds as the guest import function: the app starts in 2015, and a
 * year past 2100 is a typo, not a month someone worked.
 */
export const FIRST_YEAR = 2015;
export const LAST_YEAR = 2100;

export type MonthPeriod = { readonly year: number; readonly month: number };

const integerParam = z
  .string()
  .regex(/^\d{1,4}$/)
  .transform(Number);

const monthPeriodParams = z.object({
  year: integerParam.pipe(z.number().int().min(FIRST_YEAR).max(LAST_YEAR)),
  month: integerParam.pipe(z.number().int().min(1).max(12)),
});

/** Parses a body or params schema, or throws the API's invalid_request. */
export const parseOrThrow = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new UserDataError(
      "invalid_request",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; "),
    );
  }
  return parsed.data;
};

/** :year and :month route params. */
export const parseMonthPeriod = (params: unknown): MonthPeriod =>
  parseOrThrow(monthPeriodParams, params);

const pad = (value: number) => String(value).padStart(2, "0");

/** The month as dates: from its first day (inclusive) to the next month's (exclusive). */
export const monthRange = ({ year, month }: MonthPeriod) => ({
  start: `${year}-${pad(month)}-01`,
  end: month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`,
});

/** A calendar day (YYYY-MM-DD) that exists, within the supported years. */
export const calendarDate = z.iso.date().refine((value) => {
  const year = Number(value.slice(0, 4));
  return year >= FIRST_YEAR && year <= LAST_YEAR;
}, `Year must be ${FIRST_YEAR}–${LAST_YEAR}`);

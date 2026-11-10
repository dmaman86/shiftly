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

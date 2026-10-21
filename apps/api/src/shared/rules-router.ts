import { Router } from "express";
import { z } from "zod";
import { RulesPipelineError, type RulesPipelineErrorCode } from "./errors.ts";

const yearSchema = z.coerce.number().int().min(2000).max(2100);

const STATUS_BY_CODE: Record<RulesPipelineErrorCode, number> = {
  source_unavailable: 503,
  source_format_changed: 502,
  year_not_covered: 404,
  extraction_failed: 502,
  extraction_unclear: 422,
  invalid_extraction: 422,
};

/**
 * POST <prefix>/:year/<action> runs one pipeline for that year. Every
 * pipeline shares the year check and the error contract.
 */
export function yearRulesRouter(
  prefix: string,
  extract: (year: number) => Promise<unknown>,
  action = "rules",
): Router {
  const router = Router();

  router.post(`${prefix}/:year/${action}`, async (req, res) => {
    const year = yearSchema.safeParse(req.params.year);
    if (!year.success) {
      res.status(400).json({
        error: { code: "invalid_year", message: "Year must be 2000–2100" },
      });
      return;
    }
    try {
      res.json(await extract(year.data));
    } catch (error) {
      if (!(error instanceof RulesPipelineError)) throw error;
      // Details stay in the debug artifacts and logs; clients get a stable contract.
      console.error(
        JSON.stringify({
          event: "rules_extraction_failed",
          route: `${prefix}/${action}`,
          year: year.data,
          code: error.code,
          message: error.message,
        }),
      );
      res.status(STATUS_BY_CODE[error.code]).json({
        error: { code: error.code, message: error.message },
      });
    }
  });

  return router;
}

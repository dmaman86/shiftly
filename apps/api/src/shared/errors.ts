export type RulesPipelineErrorCode =
  | "source_unavailable"
  | "source_format_changed"
  | "year_not_covered"
  | "extraction_failed"
  | "extraction_unclear"
  | "invalid_extraction";

/**
 * Every failure of a rules pipeline is explicit. The only fallback is the
 * documented one in year-resolution.ts: a year missing from the source reuses
 * the latest earlier value and is flagged as carried forward.
 */
export class RulesPipelineError extends Error {
  readonly code: RulesPipelineErrorCode;
  readonly details: unknown;

  constructor(
    code: RulesPipelineErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "RulesPipelineError";
    this.code = code;
    this.details = details;
  }
}

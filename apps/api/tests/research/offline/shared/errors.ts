export type RulesPipelineErrorCode =
  | "source_unavailable"
  | "source_format_changed"
  | "year_not_covered"
  | "extraction_failed"
  | "extraction_unclear"
  | "invalid_extraction";

/** Error contract retained only for offline historical validator regressions. */
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

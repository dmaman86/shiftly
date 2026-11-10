import { z } from "zod";
import { RulesPipelineError } from "./errors.ts";

/** Every extraction reports whether the model could read the whole source. */
export const extractionStatus = z.enum(["complete", "unclear"]);

/** Parses a model answer and stops unless the model reported it as complete. */
export function parseComplete<T extends { status: "complete" | "unclear" }>(
  schema: z.ZodType<T>,
  raw: unknown,
): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new RulesPipelineError(
      "invalid_extraction",
      "Extraction does not match the schema",
      { issues: parsed.error.issues },
    );
  }
  if (parsed.data.status !== "complete") {
    throw new RulesPipelineError(
      "extraction_unclear",
      "The extractor reported that the source is unclear",
    );
  }
  return parsed.data;
}

export function failOn(problems: readonly string[]): void {
  if (problems.length > 0) {
    throw new RulesPipelineError(
      "invalid_extraction",
      "Extracted values failed validation",
      { problems },
    );
  }
}

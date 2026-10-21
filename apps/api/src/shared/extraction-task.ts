/**
 * What the model is asked to read from one source document. Tasks return only
 * values written in the document; resolving the requested year (and reusing
 * an earlier one when it is missing) happens in code, after validation.
 */
export type ExtractionTask = {
  /** Also names the trace artifact: llm-<name>.json. */
  readonly name: string;
  readonly systemInstruction: string;
  /** JSON Schema the provider enforces; the zod schema re-checks the answer. */
  readonly responseSchema: object;
};

/** JSON Schema of the status every task answers with. */
export const STATUS_JSON_SCHEMA = {
  type: "string",
  enum: ["complete", "unclear"],
};

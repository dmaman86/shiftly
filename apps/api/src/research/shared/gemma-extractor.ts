import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { RulesPipelineError } from "./errors.ts";
import type { ExtractionTask } from "./extraction-task.ts";

export type LlmAttempt = {
  readonly attempt: number;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly outcome: "response" | "provider_error";
  readonly httpStatus: number | null;
  readonly error: string | null;
};

/** Everything the model was asked and answered in one extraction; saved as llm-<task>.json. */
export type LlmTrace = {
  readonly model: string;
  readonly task: ExtractionTask["name"];
  readonly attempts: readonly LlmAttempt[];
  /** Text of the last answer, verbatim; null when no attempt got an answer. */
  readonly rawText: string | null;
};

export type ExtractionResult = {
  /** Unvalidated model output; the caller validates it before any use. */
  readonly raw: unknown;
  readonly trace: LlmTrace;
};

/** What the model reads: the text and a label for it. A SourceDocument fits as is. */
export type ExtractorDocument = {
  readonly format: string;
  readonly text: string;
  readonly ref: { readonly title: string };
};

export interface Extractor {
  extract(
    task: ExtractionTask,
    document: ExtractorDocument,
  ): Promise<ExtractionResult>;
}

export function isLlmTrace(value: unknown): value is LlmTrace {
  return (
    typeof value === "object" &&
    value !== null &&
    "attempts" in value &&
    "model" in value
  );
}

export const MAX_ATTEMPTS = 3;
// Only provider-side failures are retried; a bad answer is never retried into a good one.
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const BACKOFF_MS = [2_000, 8_000];
const MAX_PROVIDER_DELAY_MS = 30_000;
const ATTEMPT_TIMEOUT_MS = 90_000;

type GenerateText = (request: {
  model: string;
  contents: string;
  systemInstruction: string;
  responseJsonSchema: object;
}) => Promise<string | undefined>;

export class GemmaExtractor implements Extractor {
  private readonly model: string;
  private readonly generateText: GenerateText;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: {
    apiKey: string;
    model: string;
    /** Test seams: the provider call and the backoff wait. */
    generateText?: GenerateText;
    sleep?: (ms: number) => Promise<void>;
  }) {
    this.model = options.model;
    this.generateText =
      options.generateText ?? geminiGenerateText(options.apiKey);
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async extract(
    task: ExtractionTask,
    document: ExtractorDocument,
  ): Promise<ExtractionResult> {
    const attempts: LlmAttempt[] = [];
    const contents = `<source format="${document.format}" title="${document.ref.title}">\n${document.text}\n</source>`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const started = Date.now();
      try {
        const rawText = await this.generateText({
          model: this.model,
          contents,
          systemInstruction: task.systemInstruction,
          responseJsonSchema: task.responseSchema,
        });
        attempts.push(record(attempt, started, "response", null, null));
        return this.parse(task, rawText ?? "", attempts);
      } catch (cause) {
        if (cause instanceof RulesPipelineError) throw cause;
        const httpStatus = statusOf(cause);
        attempts.push(
          record(
            attempt,
            started,
            "provider_error",
            httpStatus,
            messageOf(cause),
          ),
        );
        // No HTTP status means the request never completed (network error or timeout).
        const retryable =
          httpStatus === null || RETRYABLE_STATUSES.has(httpStatus);
        if (!retryable || attempt === MAX_ATTEMPTS) break;
        await this.sleep(backoffMs(attempt, cause));
      }
    }

    const trace: LlmTrace = {
      model: this.model,
      task: task.name,
      attempts,
      rawText: null,
    };
    throw new RulesPipelineError(
      "extraction_failed",
      `LLM request failed after ${attempts.length} attempt(s)`,
      trace,
    );
  }

  private parse(
    task: ExtractionTask,
    rawText: string,
    attempts: LlmAttempt[],
  ): ExtractionResult {
    const trace: LlmTrace = {
      model: this.model,
      task: task.name,
      attempts,
      rawText,
    };
    if (rawText.trim().length === 0) {
      throw new RulesPipelineError(
        "extraction_failed",
        "LLM returned no content",
        trace,
      );
    }
    try {
      return { raw: JSON.parse(stripCodeFence(rawText)), trace };
    } catch {
      throw new RulesPipelineError(
        "extraction_failed",
        "LLM returned invalid JSON",
        trace,
      );
    }
  }
}

/**
 * Gemma sometimes wraps the JSON in a Markdown fence, or only closes one,
 * even in JSON mode (seen live). Removing the fence changes no value; the
 * trace keeps the answer verbatim and the validator still checks every value.
 */
function stripCodeFence(rawText: string): string {
  return rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function geminiGenerateText(apiKey: string): GenerateText {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: ATTEMPT_TIMEOUT_MS },
  });
  return async ({ model, contents, systemInstruction, responseJsonSchema }) => {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });
    return response.text;
  };
}

function record(
  attempt: number,
  started: number,
  outcome: LlmAttempt["outcome"],
  httpStatus: number | null,
  error: string | null,
): LlmAttempt {
  return {
    attempt,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    outcome,
    httpStatus,
    error,
  };
}

function statusOf(cause: unknown): number | null {
  const status = (cause as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

function messageOf(cause: unknown): string {
  return (cause instanceof Error ? cause.message : String(cause)).slice(0, 500);
}

/** Uses the provider's "retryDelay" hint when present, within a fixed cap. */
function backoffMs(attempt: number, cause: unknown): number {
  const hinted = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(messageOf(cause));
  const providerMs = hinted ? Number(hinted[1]) * 1000 : 0;
  return Math.min(
    Math.max(BACKOFF_MS[attempt - 1] ?? BACKOFF_MS.at(-1)!, providerMs),
    MAX_PROVIDER_DELAY_MS,
  );
}

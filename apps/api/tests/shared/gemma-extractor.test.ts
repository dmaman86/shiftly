import { describe, expect, it, vi } from "vitest";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import { CREDIT_POINT_TASK } from "../../src/income-tax/extraction-tasks.ts";
import { GemmaExtractor } from "../../src/shared/gemma-extractor.ts";
import type { SourceDocument } from "../../src/shared/source.ts";

const ANSWER = JSON.stringify({
  status: "complete",
  rows: [{ year: 2025, monthlyValue: 242 }],
});

const DOCUMENT: SourceDocument = {
  format: "wikitext",
  text: `{|\n|'''2025''' || 242 ש"ח\n|}`,
  ref: {
    url: "https://he.wikipedia.org/w/index.php?oldid=1",
    title: "נקודת זיכוי",
    revisionId: 1,
    license: "CC-BY-SA-4.0",
    retrievedAt: "2026-10-17T00:00:00.000Z",
  },
  includes: [],
};

const providerError = (status: number, message = `HTTP ${status}`) =>
  Object.assign(new Error(message), { status });

function extractorWith(...outcomes: (string | Error)[]) {
  const generateText = vi.fn(async () => {
    const next = outcomes.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => {});
  const extractor = new GemmaExtractor({
    apiKey: "unused",
    model: "gemma-4-31b-it",
    generateText,
    sleep,
  });
  const extract = () => extractor.extract(CREDIT_POINT_TASK, DOCUMENT);
  return { extract, generateText, sleep };
}

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(RulesPipelineError);
  return error as RulesPipelineError;
}

describe("GemmaExtractor", () => {
  it("returns the parsed answer with a one-attempt trace", async () => {
    const { extract } = extractorWith(ANSWER);
    const result = await extract();
    expect(result.raw).toEqual(JSON.parse(ANSWER));
    expect(result.trace).toMatchObject({
      model: "gemma-4-31b-it",
      task: "credit_point",
      rawText: ANSWER,
      attempts: [{ attempt: 1, outcome: "response", httpStatus: null }],
    });
  });

  it("sends the task instruction and schema with the source document", async () => {
    const { extract, generateText } = extractorWith(ANSWER);
    await extract();
    expect(generateText).toHaveBeenCalledWith({
      model: "gemma-4-31b-it",
      contents: `<source format="wikitext" title="נקודת זיכוי">\n${DOCUMENT.text}\n</source>`,
      systemInstruction: CREDIT_POINT_TASK.systemInstruction,
      responseJsonSchema: CREDIT_POINT_TASK.responseSchema,
    });
  });

  it("retries 500 and 503 and records every attempt", async () => {
    const { extract, sleep } = extractorWith(
      providerError(500),
      providerError(503),
      ANSWER,
    );
    const result = await extract();
    expect(result.trace.attempts.map((a) => [a.outcome, a.httpStatus])).toEqual(
      [
        ["provider_error", 500],
        ["provider_error", 503],
        ["response", null],
      ],
    );
    expect(sleep.mock.calls).toEqual([[2_000], [8_000]]);
  });

  it("stops after 3 attempts and keeps the trace in the error", async () => {
    const { extract, generateText } = extractorWith(
      providerError(503),
      providerError(503),
      providerError(429),
      ANSWER,
    );
    const error = await failure(extract());
    expect(generateText).toHaveBeenCalledTimes(3);
    expect(error.code).toBe("extraction_failed");
    expect(error.details).toMatchObject({
      model: "gemma-4-31b-it",
      task: "credit_point",
      rawText: null,
      attempts: [
        { attempt: 1, httpStatus: 503 },
        { attempt: 2, httpStatus: 503 },
        { attempt: 3, httpStatus: 429 },
      ],
    });
  });

  it("does not retry errors that a retry cannot fix", async () => {
    const { extract, generateText } = extractorWith(providerError(400));
    const error = await failure(extract());
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(error.details).toMatchObject({ attempts: [{ httpStatus: 400 }] });
  });

  it.each([
    ["a full fence", "```json\n" + ANSWER + "\n```"],
    ["only a closing fence", ANSWER + "\n```"],
  ])(
    "accepts JSON wrapped in %s and keeps the answer verbatim",
    async (_label, fenced) => {
      const { extract } = extractorWith(fenced);
      const result = await extract();
      expect(result.raw).toEqual(JSON.parse(ANSWER));
      expect(result.trace.rawText).toBe(fenced);
    },
  );

  it("does not retry an invalid answer", async () => {
    const invalid = "The table shows the following values: {";
    const { extract, generateText } = extractorWith(invalid, ANSWER);
    const error = await failure(extract());
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(error.message).toBe("LLM returned invalid JSON");
    expect(error.details).toMatchObject({ rawText: invalid });
  });

  it("waits at least as long as the provider asks", async () => {
    const quota = providerError(
      429,
      '{"error":{"details":[{"retryDelay":"12s"}]}}',
    );
    const { extract, sleep } = extractorWith(quota, ANSWER);
    await extract();
    expect(sleep).toHaveBeenCalledWith(12_000);
  });
});

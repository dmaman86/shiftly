import { describe, expect, it, vi } from "vitest";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import type { ExtractionTask } from "../../src/shared/extraction-task.ts";
import type { Extractor, LlmTrace } from "../../src/shared/gemma-extractor.ts";
import { extractIncomeTaxRules } from "../../src/income-tax/income-tax-pipeline.ts";
import {
  BRACKETS_2026_TITLE,
  brackets2026,
  creditPointRows,
  fakeSource,
  NOW,
  PAGES,
} from "./wikipedia-fixtures.ts";

const ANSWERS: Record<ExtractionTask["name"], unknown> = {
  brackets: { status: "complete", monthlyBrackets: brackets2026 },
  credit_point: { status: "complete", rows: creditPointRows },
};

const traceFor = (
  task: ExtractionTask["name"],
  rawText: string | null,
): LlmTrace => ({
  model: "test-model",
  task,
  rawText,
  attempts: [
    {
      attempt: 1,
      startedAt: "2026-10-17T00:00:00.000Z",
      durationMs: 10,
      outcome: "response",
      httpStatus: null,
      error: null,
    },
  ],
});

const SOURCE_KEY = "42998646-41634061";

function setup(extract?: Extractor["extract"]) {
  const written = new Map<string, string>();
  const artifacts: DebugArtifactStore = {
    forDocument: async (year, sourceKey) => ({
      write: async (name, content) => {
        written.set(`${year}/${sourceKey}/${name}`, String(content));
      },
    }),
  };
  const extractor: Extractor = {
    extract: vi.fn(
      extract ??
        (async (task: ExtractionTask) => ({
          raw: ANSWERS[task.name],
          trace: traceFor(task.name, JSON.stringify(ANSWERS[task.name])),
        })),
    ),
  };
  const deps = { source: fakeSource(), extractor, artifacts };
  return { deps, written, extractor };
}

const citation = (title: string, revisionId: number) => ({
  url: `https://he.wikipedia.org/w/index.php?oldid=${revisionId}`,
  title,
  revisionId,
  license: "CC-BY-SA-4.0",
  retrievedAt: NOW.toISOString(),
});

describe("extractIncomeTaxRules", () => {
  it("resolves 2026: its own brackets and the 2025 credit point carried forward", async () => {
    const { deps } = setup();
    const result = await extractIncomeTaxRules(2026, deps);

    expect(result.monthlyBrackets).toEqual({
      value: brackets2026,
      effectiveYear: 2026,
      carriedForward: false,
      source: citation("תבנית:מדרגות מס 2026", 42998646),
      includes: [citation("תבנית:מדרגות מס בישראל/פתיח", 21493632)],
    });
    expect(result.monthlyCreditPointValue).toEqual({
      value: 242,
      effectiveYear: 2025,
      carriedForward: true,
      source: citation("נקודת זיכוי", 41634061),
      includes: [],
    });
    expect(result.extraction).toMatchObject({
      model: "test-model",
      attempts: { brackets: 1, credit_point: 1 },
    });
  });

  it("carries the latest bracket table forward for a year with no table yet", async () => {
    const { deps } = setup();
    const result = await extractIncomeTaxRules(2027, deps);
    expect(result.monthlyBrackets).toMatchObject({
      effectiveYear: 2026,
      carriedForward: true,
    });
  });

  it("uses the table and the credit point row of the requested year when both exist", async () => {
    const { deps } = setup();
    // The fixtures hold one year table; it stands in for the 2024–2025 one here.
    const source = fakeSource({
      ...PAGES,
      "תבנית:מדרגות מס 2024": PAGES[BRACKETS_2026_TITLE],
    });
    const result = await extractIncomeTaxRules(2025, { ...deps, source });
    expect(result.monthlyBrackets).toMatchObject({
      effectiveYear: 2025,
      carriedForward: false,
      source: { title: "תבנית:מדרגות מס 2024" },
    });
    expect(result.monthlyCreditPointValue).toMatchObject({
      value: 242,
      effectiveYear: 2025,
      carriedForward: false,
    });
  });

  it("sends each source table to the model with its task and keeps every artifact", async () => {
    const { deps, written, extractor } = setup();
    await extractIncomeTaxRules(2026, deps);

    const calls = vi.mocked(extractor.extract).mock.calls;
    expect(
      calls.map(([task, document]) => [task.name, document.ref.title]),
    ).toEqual([
      ["brackets", "תבנית:מדרגות מס 2026"],
      ["credit_point", "נקודת זיכוי"],
    ]);
    expect([...written.keys()]).toEqual(
      [
        "brackets.wikitext",
        "credit-point.wikitext",
        "llm-brackets.json",
        "llm-credit_point.json",
        "result.json",
      ].map((name) => `2026/${SOURCE_KEY}/${name}`),
    );
  });

  it("stops before reading any table when no year up to the requested one is covered", async () => {
    const { deps, extractor } = setup();
    await expect(extractIncomeTaxRules(2005, deps)).rejects.toMatchObject({
      code: "year_not_covered",
    });
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it("keeps every model attempt when the extraction fails", async () => {
    const trace = traceFor("brackets", null);
    const { deps, written } = setup(async () => {
      throw new RulesPipelineError(
        "extraction_failed",
        "LLM request failed after 3 attempt(s)",
        trace,
      );
    });
    await expect(extractIncomeTaxRules(2026, deps)).rejects.toMatchObject({
      code: "extraction_failed",
    });
    expect(
      JSON.parse(written.get(`2026/${SOURCE_KEY}/llm-brackets.json`)!),
    ).toEqual(trace);
    expect(written.has(`2026/${SOURCE_KEY}/result.json`)).toBe(false);
  });

  it("stops and records the error when the model adds a year that is not in the table", async () => {
    const invented = {
      status: "complete",
      rows: [...creditPointRows, { year: 2026, monthlyValue: 242 }],
    };
    const { deps, written } = setup(async (task) => {
      const raw = task.name === "credit_point" ? invented : ANSWERS[task.name];
      return { raw, trace: traceFor(task.name, JSON.stringify(raw)) };
    });
    await expect(extractIncomeTaxRules(2026, deps)).rejects.toMatchObject({
      code: "invalid_extraction",
    });
    expect(
      JSON.parse(written.get(`2026/${SOURCE_KEY}/error.json`)!),
    ).toMatchObject({ code: "invalid_extraction" });
    expect(written.has(`2026/${SOURCE_KEY}/result.json`)).toBe(false);
  });
});

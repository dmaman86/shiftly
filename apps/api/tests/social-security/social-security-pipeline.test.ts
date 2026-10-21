import { describe, expect, it, vi } from "vitest";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import type { Extractor, LlmTrace } from "../../src/shared/gemma-extractor.ts";
import {
  extractSocialSecurityRules,
  referenceDate,
} from "../../src/social-security/social-security-pipeline.ts";
import {
  answer2020,
  answer2026,
  fakeKolZchutSource,
  NOW,
} from "./kolzchut-fixtures.ts";

const traceFor = (rawText: string): LlmTrace => ({
  model: "test-model",
  task: "employee_contributions",
  rawText,
  attempts: [
    {
      attempt: 1,
      startedAt: "2026-10-18T00:00:00.000Z",
      durationMs: 10,
      outcome: "response",
      httpStatus: null,
      error: null,
    },
  ],
});

/** Answers like a model that reads the year from the text it receives. */
const reading: Extractor["extract"] = async (_task, document) => {
  const raw = document.text.includes("נכון ל-2020") ? answer2020 : answer2026;
  return { raw, trace: traceFor(JSON.stringify(raw)) };
};

function setup(extract: Extractor["extract"] = reading) {
  const written = new Map<string, string>();
  const artifacts: DebugArtifactStore = {
    forDocument: async (year, sourceKey) => ({
      write: async (name, content) => {
        written.set(`${year}/${sourceKey}/${name}`, String(content));
      },
    }),
  };
  const extractor: Extractor = { extract: vi.fn(extract) };
  const deps = {
    source: fakeKolZchutSource(),
    extractor,
    artifacts,
    now: () => NOW,
  };
  return { deps, written, extractor };
}

describe("referenceDate", () => {
  it("is July 1 of a past year, and today for the current year before July or a future year", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    expect(referenceDate(2025, now).toISOString()).toBe(
      "2025-07-01T00:00:00.000Z",
    );
    expect(referenceDate(2026, now)).toBe(now);
    expect(referenceDate(2027, now)).toBe(now);
  });
});

describe("extractSocialSecurityRules", () => {
  it("resolves 2026 from the article and data pages of July 2026", async () => {
    const { deps } = setup();
    const result = await extractSocialSecurityRules(2026, deps);
    expect(result.employeeContributions).toMatchObject({
      value: {
        reducedRateCeiling: 7703,
        maxInsurableIncome: 51910,
        reducedRate: { nationalInsurance: 0.0104, health: 0.0323 },
        fullRate: { nationalInsurance: 0.07, health: 0.0517 },
      },
      effectiveYear: 2026,
      carriedForward: false,
      source: { revisionId: 604619, license: "CC-BY-NC-SA-2.5-IL" },
    });
    expect(result.employeeContributions.includes).toHaveLength(3);
    expect(result.referenceDate).toBe("2026-07-01T00:00:00.000Z");
  });

  it("resolves a past year from the revisions of that year", async () => {
    const { deps } = setup();
    const result = await extractSocialSecurityRules(2020, deps);
    expect(result.employeeContributions).toMatchObject({
      value: { reducedRateCeiling: 6331, maxInsurableIncome: 44020 },
      effectiveYear: 2020,
      carriedForward: false,
      source: { revisionId: 390155 },
    });
  });

  it("carries the latest stated year forward for a year the source has not updated", async () => {
    const { deps } = setup();
    const result = await extractSocialSecurityRules(2027, deps);
    expect(result.employeeContributions).toMatchObject({
      value: { reducedRateCeiling: 7703 },
      effectiveYear: 2026,
      carriedForward: true,
    });
    expect(result.referenceDate).toBe(NOW.toISOString());
  });

  it("stops and records the error when the model answers with another year's values", async () => {
    const { deps, written } = setup(async () => ({
      raw: answer2026,
      trace: traceFor(JSON.stringify(answer2026)),
    }));
    await expect(extractSocialSecurityRules(2020, deps)).rejects.toMatchObject({
      code: "invalid_extraction",
    });
    const errorFile = [...written.keys()].find((key) =>
      key.endsWith("error.json"),
    );
    expect(errorFile).toBeDefined();
  });

  it("keeps the rendered source and the model trace as artifacts", async () => {
    const { deps, written } = setup();
    await extractSocialSecurityRules(2026, deps);
    const key = "2026/604619-604858-604455-604431";
    expect([...written.keys()]).toEqual([
      `${key}/employee-contributions.wikitext`,
      `${key}/llm-employee_contributions.json`,
      `${key}/result.json`,
    ]);
    expect(written.get(`${key}/employee-contributions.wikitext`)).toContain(
      "7,703",
    );
  });
});

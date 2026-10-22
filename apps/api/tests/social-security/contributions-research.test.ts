import { describe, expect, it, vi } from "vitest";
import type { DocumentFetcher } from "../../src/research/ports.ts";
import type { ArchiveIndex } from "../../src/research/web-archive.ts";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import {
  BTL_EMPLOYEE_RATES_URL,
  researchEmployeeContributions,
} from "../../src/social-security/contributions-research.ts";
import type { SocialSecuritySourceProvider } from "../../src/social-security/social-security-source.ts";
import {
  BTL_2015,
  BTL_2025_FEBRUARY,
  BTL_LIVE,
  CAPTURE_2015,
  CAPTURE_2025,
  TODAY,
  btlDocument,
} from "./btl-fixtures.ts";
import { fakeKolZchutSource } from "./kolzchut-fixtures.ts";

const artifacts: DebugArtifactStore = {
  forDocument: async () => ({ write: async () => {} }),
};

const TEXTS: Record<string, string> = {
  [BTL_EMPLOYEE_RATES_URL]: BTL_LIVE,
  [CAPTURE_2015.url]: BTL_2015,
  [CAPTURE_2025.url]: BTL_2025_FEBRUARY,
};

const fetcher: DocumentFetcher = {
  async fetch(url) {
    const text = TEXTS[url];
    if (text === undefined) throw new Error(`unexpected fetch of ${url}`);
    return btlDocument(url, text);
  },
};

const archive: ArchiveIndex = {
  snapshots: async () => [CAPTURE_2015, CAPTURE_2025],
};

const blockedKolZchut: SocialSecuritySourceProvider = {
  employeeContributionsAt: vi.fn(async () => {
    throw new RulesPipelineError(
      "source_unavailable",
      "https://www.kolzchut.org.il/w/he/api.php answered HTTP 403",
      { status: 403 },
    );
  }),
};

const run = (kolZchut: SocialSecuritySourceProvider, index = archive) =>
  researchEmployeeContributions({
    fetcher,
    archive: index,
    kolZchut,
    artifacts,
    now: () => TODAY,
  });

const periodsOf = (
  report: Awaited<ReturnType<typeof run>>,
  parameter: string,
) =>
  [
    ...report.timelines.periods
      .filter((period) => period.parameter === parameter)
      .map(
        (p) => `${p.validFrom}→${p.validTo ?? "open"} ${p.value} ${p.trust}`,
      ),
    ...report.timelines.missing
      .filter((gap) => gap.parameter === parameter)
      .map((g) => `${g.validFrom}→${g.validTo} ${g.reason}`),
  ].sort();

describe("researchEmployeeContributions", () => {
  it("reads official captures and the live page; a blocked secondary leaves gaps missing", async () => {
    const report = await run(blockedKolZchut);

    expect(report.archive).toEqual({ status: "read", captures: 2 });
    expect(report.observations.map((o) => [o.observedOn, o.live])).toEqual([
      ["2015-12-27", false],
      ["2025-02-05", false],
      ["2026-10-22", true],
    ]);
    expect(report.yearsWithoutOfficialReading).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
    ]);
    // Blocked once, never retried: the remaining stretches stay missing.
    expect(report.secondary).toBe("blocked");
    expect(blockedKolZchut.employeeContributionsAt).toHaveBeenCalledTimes(1);

    expect(periodsOf(report, "reducedRateBoundary")).toEqual([
      "2015-11-01→2016-01-01 5556 official_verified",
      "2016-01-01→2024-01-01 no_evidence",
      "2024-01-01→2025-03-01 7522 official_verified",
      "2025-03-01→2026-01-01 no_evidence",
      "2026-01-01→open 7703 official_verified",
    ]);
    expect(periodsOf(report, "healthInsuranceStandardRate")).toEqual([
      "2015-11-01→2016-01-01 0.05 official_verified",
      "2016-01-01→2025-02-01 no_evidence",
      "2025-02-01→open 0.0517 official_verified",
    ]);
    expect(periodsOf(report, "nationalInsuranceStandardRate")).toEqual([
      "2015-11-01→open 0.07 official_verified",
    ]);
  });

  it("fills official gaps from Kol Zchut as of each gap's end, never past what it states", async () => {
    const report = await run(fakeKolZchutSource());

    expect(report.secondary).toBe("used");
    // Kol Zchut, as of the end of 2020, states the 2020 boundary "for 2020".
    expect(periodsOf(report, "reducedRateBoundary")).toContain(
      "2020-01-01→2021-01-01 6331 secondary_verified",
    );
    expect(periodsOf(report, "reducedRateBoundary")).toContain(
      "2016-01-01→2020-01-01 no_evidence",
    );
    const secondary = report.candidates.filter(
      (candidate) => candidate.trust === "secondary_verified",
    );
    expect(secondary.length).toBeGreaterThan(0);
    for (const candidate of secondary) {
      expect(candidate.fallbackReason).toBe("official_source_not_found");
      expect(candidate.sources[0].publisher).toBe("www.kolzchut.org.il");
    }
  });

  it("keeps working from the live page when the archive index is down", async () => {
    const report = await run(blockedKolZchut, {
      snapshots: async () => {
        throw new Error("the archive index answered HTTP 503");
      },
    });
    expect(report.archive).toEqual({
      status: "unavailable",
      problem: "the archive index answered HTTP 503",
    });
    expect(report.observations).toHaveLength(1);
    expect(periodsOf(report, "maxInsurableIncome")).toContain(
      "2026-01-01→open 51910 official_verified",
    );
  });

  it("creates only pending research candidates of the six kinds", async () => {
    const report = await run(blockedKolZchut);
    expect(new Set(report.candidates.map((c) => c.kind))).toEqual(
      new Set([
        "social_security.reduced_rate_boundary",
        "social_security.max_insurable_income",
        "national_insurance.employee_reduced_rate",
        "national_insurance.employee_standard_rate",
        "health_insurance.employee_reduced_rate",
        "health_insurance.employee_standard_rate",
      ]),
    );
    for (const candidate of report.candidates) {
      expect(candidate).toMatchObject({ origin: "research", subjectKey: null });
      expect(candidate.evidence.length).toBeGreaterThan(0);
    }
  });
});

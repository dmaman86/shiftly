import { describe, expect, it, vi } from "vitest";
import type { DocumentFetcher } from "../../src/research/ports.ts";
import type { ArchiveIndex } from "../../src/research/web-archive.ts";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import {
  annualReportUrl,
  RATE_HISTORY_URL,
  THRESHOLD_HISTORY_URL,
} from "../../src/social-security/contributions-history.ts";
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
  EMPLOYEE_TOTAL_HISTORY,
  REPORT_2018,
  REPORT_2019,
  THRESHOLD_HISTORY,
  TODAY,
  btlDocument,
} from "./btl-fixtures.ts";
import { fakeKolZchutSource } from "./kolzchut-fixtures.ts";

const artifacts: DebugArtifactStore = {
  forDocument: async () => ({ write: async () => {} }),
};

const PAGES: Record<string, string> = {
  [BTL_EMPLOYEE_RATES_URL]: BTL_LIVE,
  [CAPTURE_2015.url]: BTL_2015,
  [CAPTURE_2025.url]: BTL_2025_FEBRUARY,
};

const HISTORY: Record<string, string> = {
  [THRESHOLD_HISTORY_URL]: THRESHOLD_HISTORY,
  [RATE_HISTORY_URL]: EMPLOYEE_TOTAL_HISTORY,
};

const REPORTS: Record<string, string> = {
  [annualReportUrl(2018)]: REPORT_2018,
  [annualReportUrl(2019)]: REPORT_2019,
};

/** Serves the given texts; anything else is not found, like a missing report. */
const fetcherOf = (texts: Record<string, string>): DocumentFetcher => ({
  async fetch(url) {
    const text = texts[url];
    if (text === undefined) {
      return btlDocument(url, "", {
        httpStatus: 404,
        accessibility: "not_found",
        problem: "HTTP 404",
        sha256: null,
        format: null,
      });
    }
    return url.endsWith(".pdf")
      ? btlDocument(url, text, {
          contentType: "application/pdf",
          format: "pdf-text",
        })
      : btlDocument(url, text);
  },
});

const archive: ArchiveIndex = {
  snapshots: async () => [CAPTURE_2015, CAPTURE_2025],
};

const blockedKolZchut = (): SocialSecuritySourceProvider => ({
  employeeContributionsAt: vi.fn(async () => {
    throw new RulesPipelineError(
      "source_unavailable",
      "https://www.kolzchut.org.il/w/he/api.php answered HTTP 403",
      { status: 403 },
    );
  }),
});

const run = (
  options: {
    texts?: Record<string, string>;
    kolZchut?: SocialSecuritySourceProvider;
    archive?: ArchiveIndex;
  } = {},
) =>
  researchEmployeeContributions({
    fetcher: fetcherOf(options.texts ?? PAGES),
    archive: options.archive ?? archive,
    kolZchut: options.kolZchut ?? blockedKolZchut(),
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
  it("reads captures and the live page; a blocked secondary leaves gaps missing", async () => {
    const kolZchut = blockedKolZchut();
    const report = await run({ kolZchut });

    expect(report.archive).toEqual({ status: "read", captures: 2 });
    expect(report.readings.map((r) => [r.label, r.observedOn])).toEqual([
      ["rates page 2015", "2015-12-27"],
      ["rates page 2025", "2025-02-05"],
      ["rates page 2026", "2026-10-22"],
    ]);
    // Blocked once, never retried: the remaining stretches stay missing.
    expect(report.secondary).toBe("blocked");
    expect(kolZchut.employeeContributionsAt).toHaveBeenCalledTimes(1);

    expect(periodsOf(report, "reducedRateBoundary")).toEqual([
      "2015-11-01→2016-01-01 5556 official_verified",
      "2016-01-01→2024-01-01 no_evidence",
      "2024-01-01→2025-03-01 7522 official_verified",
      "2025-03-01→2026-01-01 no_evidence",
      "2026-01-01→open 7703 official_verified",
    ]);
    expect(periodsOf(report, "nationalInsuranceStandardRate")).toEqual([
      "2015-11-01→open 0.07 official_verified",
    ]);
  });

  it("fills the gaps from the official change-point tables and yearly reports", async () => {
    const report = await run({ texts: { ...PAGES, ...HISTORY, ...REPORTS } });

    expect(report.readings.map((r) => r.label)).toEqual([
      "thresholds change-point table",
      "employee totals change-point table",
      "report 2018",
      "report 2019",
      "rates page 2015",
      "rates page 2025",
      "rates page 2026",
    ]);
    expect(periodsOf(report, "reducedRateBoundary")).toEqual([
      "2015-11-01→2016-01-01 5556 official_verified",
      "2016-01-01→2017-01-01 5678 official_verified",
      "2017-01-01→2018-01-01 5804 official_verified",
      "2018-01-01→2019-01-01 5944 official_verified",
      "2019-01-01→2020-01-01 6164 official_verified",
      "2020-01-01→2023-01-01 6331 official_verified",
      "2023-01-01→2024-01-01 7122 official_verified",
      "2024-01-01→2025-03-01 7522 official_verified",
      "2025-03-01→2026-01-01 no_evidence",
      "2026-01-01→open 7703 official_verified",
    ]);
    expect(periodsOf(report, "maxInsurableIncome")).toContain(
      "2015-11-01→2018-01-01 43240 official_verified",
    );
    expect(periodsOf(report, "healthInsuranceReducedRate")).toContain(
      "2017-01-01→2020-01-01 0.031 official_verified",
    );
    // National Insurance's reduced rate is never stated alone: the employee
    // total minus health, reported but not stored.
    expect(periodsOf(report, "nationalInsuranceReducedRate")).toContain(
      "2017-01-01→2020-01-01 0.004 official_derived",
    );
    expect(periodsOf(report, "healthInsuranceStandardRate")).toContain(
      "2025-01-01→2025-02-01 0.0516 official_derived",
    );
    expect(report.timelines.conflicts).toEqual([]);
    expect(
      report.candidates.some(
        (candidate) => (candidate.trust as string) === "official_derived",
      ),
    ).toBe(false);
  });

  it("fills official gaps from Kol Zchut as of each gap's end, never past what it states", async () => {
    const report = await run({ kolZchut: fakeKolZchutSource() });

    expect(report.secondary).toBe("used");
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
    const report = await run({
      archive: {
        snapshots: async () => {
          throw new Error("the archive index answered HTTP 503");
        },
      },
    });
    expect(report.archive).toEqual({
      status: "unavailable",
      problem: "the archive index answered HTTP 503",
    });
    expect(report.readings).toHaveLength(1);
    expect(periodsOf(report, "maxInsurableIncome")).toContain(
      "2026-01-01→open 51910 official_verified",
    );
  });

  it("creates only pending research candidates of the six kinds", async () => {
    const report = await run({ texts: { ...PAGES, ...HISTORY, ...REPORTS } });
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

import { describe, expect, it } from "vitest";
import type { CandidateSource } from "../../src/reference-data/ports.ts";
import {
  buildContributionTimelines,
  contributionCandidates,
  deriveEvidence,
  observationEvidence,
  reportEvidence,
  thresholdEvidence,
  type ContributionEvidence,
  type ContributionReading,
  type EmployeeTotalSpan,
} from "../../src/social-security/contributions-timeline.ts";
import type {
  ContributionClaim,
  ContributionParameter,
} from "../../src/social-security/employee-contributions.ts";

const claim = (
  value: number,
  statedFrom: string | null = null,
  statedUntil: string | null = null,
): ContributionClaim => ({
  value,
  statedFrom,
  statedUntil,
  quote: `quoted value ${value}`,
  statedFromQuote: statedFrom === null ? null : `quoted date ${statedFrom}`,
});

const BASE: Record<ContributionParameter, ContributionClaim> = {
  reducedRateBoundary: claim(7522, "2024-01-01"),
  maxInsurableIncome: claim(50695, "2025-01-01"),
  nationalInsuranceReducedRate: claim(0.0104, "2025-01-01"),
  nationalInsuranceStandardRate: claim(0.07, "2006-01-01"),
  healthInsuranceReducedRate: claim(0.0323, "2025-01-01"),
  healthInsuranceStandardRate: claim(0.0517, "2025-02-01"),
};

const source = (url: string): CandidateSource => ({
  url,
  finalUrl: url,
  publisher: new URL(url).hostname,
  tier: 1,
  discoveredVia: "known_source",
  accessStatus: "fetched",
  httpStatus: 200,
  contentType: "text/html",
  title: null,
  sha256: url.length.toString(16).padStart(64, "0"),
  grounding: null,
  fetchAttemptedAt: "2026-10-22T09:00:00.000Z",
  role: "supporting",
});

/** Collects readings and their evidence as the research does. */
function research() {
  const readings: ContributionReading[] = [];
  const evidence: ContributionEvidence[] = [];
  const reading = (
    label: string,
    observedOn: string,
    trust: "official" | "secondary" = "official",
  ) => {
    readings.push({
      label,
      observedOn,
      trust,
      provenance: {
        sources: [source(`https://example.gov.il/${label}/${observedOn}`)],
        supportingSource: 0,
        fallbackReason:
          trust === "secondary" ? "official_source_not_found" : null,
      },
    });
    return readings.length - 1;
  };
  const observe = (
    observedOn: string,
    patch: Partial<Record<ContributionParameter, ContributionClaim>> = {},
    options: {
      trust?: "official" | "secondary";
      live?: boolean;
      annual?: boolean;
    } = {},
  ) => {
    const trust = options.trust ?? "official";
    evidence.push(
      ...observationEvidence(
        {
          observedOn,
          trust,
          live: options.live ?? false,
          claims: {
            claims: { ...BASE, ...patch },
            annualMaxUpdate: options.annual
              ? "ההכנסה המרבית מתעדכנת בינואר כל שנה"
              : null,
          },
        },
        reading("page", observedOn, trust),
      ),
    );
  };
  return { readings, evidence, reading, observe };
}

const WINDOW = { from: "2025-01-01", until: "2025-07-01" };

const rows = (
  evidence: readonly ContributionEvidence[],
  parameter: ContributionParameter,
  window = WINDOW,
) => {
  const timelines = buildContributionTimelines(evidence, window);
  return [
    ...timelines.periods
      .filter((period) => period.parameter === parameter)
      .map((p) => [p.validFrom, p.validTo, p.value, p.trust]),
    ...timelines.missing
      .filter((gap) => gap.parameter === parameter)
      .map((g) => [g.validFrom, g.validTo, g.reason]),
  ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
};

describe("rates page evidence", () => {
  it("covers from the stated date through the month the page was read", () => {
    const { evidence, observe } = research();
    observe("2025-03-10");
    expect(rows(evidence, "healthInsuranceStandardRate")).toEqual([
      ["2025-01-01", "2025-02-01", "no_evidence"],
      ["2025-02-01", "2025-04-01", 0.0517, "official_verified"],
      ["2025-04-01", "2025-07-01", "no_evidence"],
    ]);
  });

  it("keeps a gap between two readings of the same value", () => {
    const { evidence, observe } = research();
    observe("2025-01-20");
    observe("2025-05-02", { reducedRateBoundary: claim(7522) });
    expect(rows(evidence, "reducedRateBoundary")).toEqual([
      ["2025-01-01", "2025-02-01", 7522, "official_verified"],
      ["2025-02-01", "2025-05-01", "no_evidence"],
      ["2025-05-01", "2025-06-01", 7522, "official_verified"],
      ["2025-06-01", "2025-07-01", "no_evidence"],
    ]);
  });

  it("extends the maximum to December only when the page says it changes in January", () => {
    const window = { from: "2025-01-01", until: "2026-07-01" };
    const annual = research();
    annual.observe("2025-03-10", {}, { annual: true });
    expect(rows(annual.evidence, "maxInsurableIncome", window)).toEqual([
      ["2025-01-01", "2026-01-01", 50695, "official_verified"],
      ["2026-01-01", "2026-07-01", "no_evidence"],
    ]);
    const plain = research();
    plain.observe("2025-03-10");
    expect(rows(plain.evidence, "maxInsurableIncome", window)[0]).toEqual([
      "2025-01-01",
      "2025-04-01",
      50695,
      "official_verified",
    ]);
  });

  it("stops a year-limited statement at the end of that year", () => {
    const { evidence, observe } = research();
    observe(
      "2021-12-31",
      { reducedRateBoundary: claim(6331, "2020-01-01", "2021-01-01") },
      { trust: "secondary" },
    );
    expect(
      rows(evidence, "reducedRateBoundary", {
        from: "2020-01-01",
        until: "2022-01-01",
      }),
    ).toEqual([
      ["2020-01-01", "2021-01-01", 6331, "secondary_verified"],
      ["2021-01-01", "2022-01-01", "no_evidence"],
    ]);
  });

  it("leaves only the period the live page supports open-ended", () => {
    const live = research();
    live.observe("2025-06-15", {}, { live: true });
    expect(
      buildContributionTimelines(live.evidence, WINDOW).periods.find(
        (period) => period.parameter === "nationalInsuranceStandardRate",
      ),
    ).toMatchObject({ validFrom: "2025-01-01", validTo: null });
    const archived = research();
    archived.observe("2025-06-15");
    expect(
      buildContributionTimelines(archived.evidence, WINDOW).periods,
    ).not.toContainEqual(expect.objectContaining({ validTo: null }));
  });
});

describe("historical evidence", () => {
  it("holds each change-point row until the next one, and the newest row for its month only", () => {
    const { evidence, reading } = research();
    evidence.push(
      ...thresholdEvidence(
        {
          rows: [
            {
              from: "2019-01-01",
              reducedRateBoundary: 6164,
              maxInsurableIncome: 43890,
              quote: "01/01/2019 | 5,300 | 6,164 | 43,890 | 43,890 |",
            },
            {
              from: "2018-01-01",
              reducedRateBoundary: 5944,
              maxInsurableIncome: 43370,
              quote: "01/01/2018 | 5,300 | 5,944 | 43,370 | 43,370 |",
            },
            {
              from: "2003-01-01",
              reducedRateBoundary: 3482,
              maxInsurableIncome: null,
              quote: "01/01/2003 | 3,335.18 | 3,482 | אין מגבלה | אין מגבלה |",
            },
          ],
        },
        reading("thresholds", "2026-10-22"),
      ),
    );
    const window = { from: "2017-11-01", until: "2019-06-01" };
    expect(rows(evidence, "reducedRateBoundary", window)).toEqual([
      ["2017-11-01", "2018-01-01", 3482, "official_verified"],
      ["2018-01-01", "2019-01-01", 5944, "official_verified"],
      ["2019-01-01", "2019-02-01", 6164, "official_verified"],
      ["2019-02-01", "2019-06-01", "no_evidence"],
    ]);
    expect(rows(evidence, "maxInsurableIncome", window)[0]).toEqual([
      "2017-11-01",
      "2018-01-01",
      "no_evidence",
    ]);
  });

  it("covers a report's year, and the earlier year it says rates stayed as", () => {
    const { evidence, reading } = research();
    evidence.push(
      ...reportEvidence(
        {
          year: 2018,
          yearQuote: "בשנת 2018",
          statedFrom: null,
          sameAsYear: 2017,
          sameAsQuote: "נותרו כבשנת 2017",
          headerQuote: "שיעור רגיל שיעור מופחת",
          healthReduced: 0.031,
          healthStandard: 0.05,
          quote: "דמי ביטוח בריאות 5.00 3.10",
        },
        reading("report", "2026-10-22"),
      ),
    );
    expect(
      rows(evidence, "healthInsuranceReducedRate", {
        from: "2016-12-01",
        until: "2019-02-01",
      }),
    ).toEqual([
      ["2016-12-01", "2017-01-01", "no_evidence"],
      ["2017-01-01", "2019-01-01", 0.031, "official_verified"],
      ["2019-01-01", "2019-02-01", "no_evidence"],
    ]);
  });
});

describe("derived evidence", () => {
  const total = (
    part: "reduced" | "standard",
    value: number,
    from: string,
    until: string,
  ): EmployeeTotalSpan => ({
    part,
    value,
    from,
    until,
    quote: {
      reading: 0,
      quote: `total ${value}`,
      sourceReference: null,
      effectiveFrom: from,
      note: "total",
    },
  });

  it("derives one insurance from the total and the other, only where both are official", () => {
    const { evidence, observe } = research();
    observe("2025-03-10");
    const derived = deriveEvidence(evidence, [
      total("standard", 0.1216, "2025-01-01", "2025-02-01"),
    ]);
    expect(derived).toEqual([
      expect.objectContaining({
        parameter: "healthInsuranceStandardRate",
        value: 0.0516,
        from: "2025-01-01",
        until: "2025-02-01",
        rank: "derived",
      }),
    ]);
    expect(
      rows([...evidence, ...derived], "healthInsuranceStandardRate").slice(
        0,
        2,
      ),
    ).toEqual([
      ["2025-01-01", "2025-02-01", 0.0516, "official_derived"],
      ["2025-02-01", "2025-04-01", 0.0517, "official_verified"],
    ]);
  });

  it("prefers official values and reports a derived value that disagrees", () => {
    const { evidence, observe } = research();
    observe("2025-03-10");
    const derived = deriveEvidence(evidence, [
      total("reduced", 0.0428, "2025-01-01", "2025-04-01"),
    ]);
    const timelines = buildContributionTimelines(
      [...evidence, ...derived],
      WINDOW,
    );
    expect(
      timelines.periods.find(
        (period) => period.parameter === "nationalInsuranceReducedRate",
      ),
    ).toMatchObject({ value: 0.0104, trust: "official_verified" });
    expect(timelines.conflicts).toContainEqual(
      expect.objectContaining({
        parameter: "nationalInsuranceReducedRate",
        between: "derived_vs_official",
        values: [0.0104, 0.0105],
      }),
    );
  });

  it("never derives from secondary evidence", () => {
    const { evidence, observe } = research();
    observe("2025-03-10", {}, { trust: "secondary" });
    expect(
      deriveEvidence(evidence, [
        total("standard", 0.1216, "2025-01-01", "2025-02-01"),
      ]),
    ).toEqual([]);
  });
});

describe("conflicts and fallback", () => {
  it("leaves months where official evidence disagrees missing, and reports them", () => {
    const { evidence, observe } = research();
    observe("2025-03-10");
    observe("2025-04-10", { reducedRateBoundary: claim(7600, "2025-03-01") });
    const timelines = buildContributionTimelines(evidence, WINDOW);
    expect(timelines.missing).toContainEqual({
      parameter: "reducedRateBoundary",
      validFrom: "2025-03-01",
      validTo: "2025-04-01",
      reason: "conflicting_evidence",
    });
    expect(timelines.conflicts).toEqual([
      {
        parameter: "reducedRateBoundary",
        validFrom: "2025-03-01",
        validTo: "2025-04-01",
        between: "official",
        values: [7522, 7600],
      },
    ]);
  });

  it("fills only official gaps with secondary evidence, and reports disagreements", () => {
    const { evidence, observe } = research();
    observe("2025-02-10");
    observe(
      "2025-04-30",
      { healthInsuranceStandardRate: claim(0.0516, "2025-01-01") },
      { trust: "secondary" },
    );
    expect(rows(evidence, "healthInsuranceStandardRate")).toEqual([
      ["2025-01-01", "2025-02-01", 0.0516, "secondary_verified"],
      ["2025-02-01", "2025-03-01", 0.0517, "official_verified"],
      ["2025-03-01", "2025-05-01", 0.0516, "secondary_verified"],
      ["2025-05-01", "2025-07-01", "no_evidence"],
    ]);
    expect(
      buildContributionTimelines(evidence, WINDOW).conflicts,
    ).toContainEqual({
      parameter: "healthInsuranceStandardRate",
      validFrom: "2025-02-01",
      validTo: "2025-03-01",
      between: "secondary_vs_official",
      values: [0.0516, 0.0517],
    });
  });
});

describe("contributionCandidates", () => {
  it("builds one pending research revision per verified period", () => {
    const { evidence, readings, observe } = research();
    observe("2025-01-20");
    observe("2025-02-10");
    const candidates = contributionCandidates(
      buildContributionTimelines(evidence, {
        from: "2025-01-01",
        until: "2025-03-01",
      }),
      evidence,
      readings,
    );
    expect(
      candidates.filter(
        (candidate) =>
          candidate.kind === "health_insurance.employee_standard_rate",
      ),
    ).toEqual([
      {
        kind: "health_insurance.employee_standard_rate",
        subjectKey: null,
        validFrom: "2025-02-01",
        validTo: "2025-03-01",
        value: { rate: 0.0517 },
        origin: "research",
        trust: "official_verified",
        fallbackReason: null,
        sources: [source("https://example.gov.il/page/2025-02-10")],
        evidence: [
          {
            evidenceType: "fetched_verified",
            source: 0,
            carriedFromRevisionId: null,
            quote: "quoted value 0.0517",
            section: null,
            sourceReference: "quoted date 2025-02-01",
            page: null,
            effectiveFrom: "2025-02-01",
            grounding: null,
            note: "Read as of 2025-02-10.",
          },
        ],
      },
    ]);
    const boundary = candidates.find(
      (candidate) => candidate.kind === "social_security.reduced_rate_boundary",
    );
    expect(boundary).toMatchObject({
      validFrom: "2025-01-01",
      validTo: "2025-03-01",
      value: { amount: 7522 },
    });
    expect(boundary?.sources).toHaveLength(2);
    expect(boundary?.evidence.map((item) => item.source)).toEqual([0, 1]);
  });

  it("keeps the fallback reason on secondary revisions", () => {
    const { evidence, readings, observe } = research();
    observe("2025-01-20", {}, { trust: "secondary" });
    const [first] = contributionCandidates(
      buildContributionTimelines(evidence, {
        from: "2025-01-01",
        until: "2025-02-01",
      }),
      evidence,
      readings,
    );
    expect(first).toMatchObject({
      trust: "secondary_verified",
      fallbackReason: "official_source_not_found",
    });
  });

  it("stores no derived period", () => {
    const { evidence, readings, observe } = research();
    observe("2025-03-10");
    evidence.push(
      ...deriveEvidence(evidence, [
        {
          part: "standard",
          value: 0.1216,
          from: "2025-01-01",
          until: "2025-02-01",
          quote: {
            reading: 0,
            quote: "total 0.1216",
            sourceReference: null,
            effectiveFrom: "2025-01-01",
            note: "total",
          },
        },
      ]),
    );
    const candidates = contributionCandidates(
      buildContributionTimelines(evidence, WINDOW),
      evidence,
      readings,
    );
    expect(
      candidates.filter(
        (candidate) =>
          candidate.kind === "health_insurance.employee_standard_rate" &&
          candidate.validFrom === "2025-01-01",
      ),
    ).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { CandidateSource } from "../../src/reference-data/ports.ts";
import {
  buildContributionTimelines,
  contributionCandidates,
  type ResearchedObservation,
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

const observation = (
  observedOn: string,
  patch: Partial<Record<ContributionParameter, ContributionClaim>> = {},
  options: {
    trust?: "official" | "secondary";
    live?: boolean;
    annual?: boolean;
  } = {},
): ResearchedObservation => ({
  observedOn,
  trust: options.trust ?? "official",
  live: options.live ?? false,
  claims: {
    claims: { ...BASE, ...patch },
    annualMaxUpdate: options.annual
      ? "ההכנסה המרבית מתעדכנת בינואר כל שנה"
      : null,
  },
  provenance: {
    sources: [source(`https://example.gov.il/${observedOn}`)],
    supportingSource: 0,
    fallbackReason:
      options.trust === "secondary" ? "official_source_not_found" : null,
  },
});

const WINDOW = { from: "2025-01-01", until: "2025-07-01" };

const rows = (
  observations: ResearchedObservation[],
  parameter: ContributionParameter,
  window = WINDOW,
) => {
  const timelines = buildContributionTimelines(observations, window);
  return [
    ...timelines.periods
      .filter((period) => period.parameter === parameter)
      .map((p) => [p.validFrom, p.validTo, p.value, p.trust]),
    ...timelines.missing
      .filter((gap) => gap.parameter === parameter)
      .map((g) => [g.validFrom, g.validTo, g.reason]),
  ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
};

describe("buildContributionTimelines", () => {
  it("covers from the stated date through the month the source was read", () => {
    expect(
      rows([observation("2025-03-10")], "healthInsuranceStandardRate"),
    ).toEqual([
      ["2025-01-01", "2025-02-01", "no_evidence"],
      ["2025-02-01", "2025-04-01", 0.0517, "official_verified"],
      ["2025-04-01", "2025-07-01", "no_evidence"],
    ]);
  });

  it("keeps a gap between two readings of the same value", () => {
    expect(
      rows(
        [
          observation("2025-01-20"),
          observation("2025-05-02", {
            reducedRateBoundary: claim(7522),
          }),
        ],
        "reducedRateBoundary",
      ),
    ).toEqual([
      ["2025-01-01", "2025-02-01", 7522, "official_verified"],
      ["2025-02-01", "2025-05-01", "no_evidence"],
      ["2025-05-01", "2025-06-01", 7522, "official_verified"],
      ["2025-06-01", "2025-07-01", "no_evidence"],
    ]);
  });

  it("extends the maximum to December only when the source says it changes in January", () => {
    const window = { from: "2025-01-01", until: "2026-07-01" };
    expect(
      rows(
        [observation("2025-03-10", {}, { annual: true })],
        "maxInsurableIncome",
        window,
      ),
    ).toEqual([
      ["2025-01-01", "2026-01-01", 50695, "official_verified"],
      ["2026-01-01", "2026-07-01", "no_evidence"],
    ]);
    expect(
      rows([observation("2025-03-10")], "maxInsurableIncome", window)[0],
    ).toEqual(["2025-01-01", "2025-04-01", 50695, "official_verified"]);
  });

  it("stops a year-limited statement at the end of that year", () => {
    const window = { from: "2020-01-01", until: "2022-01-01" };
    expect(
      rows(
        [
          observation(
            "2021-12-31",
            { reducedRateBoundary: claim(6331, "2020-01-01", "2021-01-01") },
            { trust: "secondary" },
          ),
        ],
        "reducedRateBoundary",
        window,
      ),
    ).toEqual([
      ["2020-01-01", "2021-01-01", 6331, "secondary_verified"],
      ["2021-01-01", "2022-01-01", "no_evidence"],
    ]);
  });

  it("leaves months where official readings disagree missing, and reports them", () => {
    const timelines = buildContributionTimelines(
      [
        observation("2025-03-10"),
        observation("2025-04-10", {
          reducedRateBoundary: claim(7600, "2025-03-01"),
        }),
      ],
      WINDOW,
    );
    expect(
      timelines.missing.filter(
        (gap) => gap.parameter === "reducedRateBoundary",
      ),
    ).toContainEqual({
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

  it("fills only official gaps with secondary readings, and reports disagreements", () => {
    const official = observation("2025-02-10");
    const secondary = observation(
      "2025-04-30",
      { healthInsuranceStandardRate: claim(0.0516, "2025-01-01") },
      { trust: "secondary" },
    );
    expect(rows([official, secondary], "healthInsuranceStandardRate")).toEqual([
      ["2025-01-01", "2025-02-01", 0.0516, "secondary_verified"],
      ["2025-02-01", "2025-03-01", 0.0517, "official_verified"],
      ["2025-03-01", "2025-05-01", 0.0516, "secondary_verified"],
      ["2025-05-01", "2025-07-01", "no_evidence"],
    ]);
    expect(
      buildContributionTimelines([official, secondary], WINDOW).conflicts,
    ).toContainEqual({
      parameter: "healthInsuranceStandardRate",
      validFrom: "2025-02-01",
      validTo: "2025-03-01",
      between: "secondary_vs_official",
      values: [0.0516, 0.0517],
    });
  });

  it("leaves only the period the live page supports open-ended", () => {
    const timelines = buildContributionTimelines(
      [observation("2025-06-15", {}, { live: true })],
      WINDOW,
    );
    expect(
      timelines.periods.find(
        (period) => period.parameter === "nationalInsuranceStandardRate",
      ),
    ).toMatchObject({ validFrom: "2025-01-01", validTo: null });
    expect(
      buildContributionTimelines([observation("2025-06-15")], WINDOW).periods,
    ).not.toContainEqual(expect.objectContaining({ validTo: null }));
  });
});

describe("contributionCandidates", () => {
  it("builds one pending research revision per covered period", () => {
    const observations = [observation("2025-01-20"), observation("2025-02-10")];
    const candidates = contributionCandidates(
      buildContributionTimelines(observations, {
        from: "2025-01-01",
        until: "2025-03-01",
      }),
      observations,
    );
    const health = candidates.filter(
      (candidate) =>
        candidate.kind === "health_insurance.employee_standard_rate",
    );
    expect(health).toEqual([
      {
        kind: "health_insurance.employee_standard_rate",
        subjectKey: null,
        validFrom: "2025-02-01",
        validTo: "2025-03-01",
        value: { rate: 0.0517 },
        origin: "research",
        trust: "official_verified",
        fallbackReason: null,
        sources: [source("https://example.gov.il/2025-02-10")],
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
    const observations = [
      observation("2025-01-20", {}, { trust: "secondary" }),
    ];
    const [first] = contributionCandidates(
      buildContributionTimelines(observations, {
        from: "2025-01-01",
        until: "2025-02-01",
      }),
      observations,
    );
    expect(first).toMatchObject({
      trust: "secondary_verified",
      fallbackReason: "official_source_not_found",
    });
  });
});

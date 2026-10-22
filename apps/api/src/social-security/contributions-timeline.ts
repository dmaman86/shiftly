import type {
  CandidateEvidence,
  CandidateSource,
  NewCandidate,
  RevisionFallbackReason,
} from "../reference-data/ports.ts";
import type {
  AnnualReportRates,
  EmployeeTotalHistory,
  ThresholdHistory,
} from "./contributions-history.ts";
import {
  CONTRIBUTION_KINDS,
  CONTRIBUTION_PARAMETERS,
  contributionValue,
  type ContributionClaims,
  type ContributionParameter,
} from "./employee-contributions.ts";

/** Where a reading's values were read, for the revision's provenance. */
export type ObservationProvenance = {
  readonly sources: readonly CandidateSource[];
  /** Index into `sources` of the document the values were read from. */
  readonly supportingSource: number;
  /** Why the values do not come from an official source; null when they do. */
  readonly fallbackReason: RevisionFallbackReason | null;
};

/** One validated document: a rates page, a capture, a history table or a report. */
export type ContributionReading = {
  readonly label: string;
  /** The day the document showed its values (capture day for archives). */
  readonly observedOn: string;
  readonly trust: "official" | "secondary";
  readonly provenance: ObservationProvenance;
};

/** A passage of one reading that supports a value. */
export type EvidenceQuote = {
  /** Index into the readings. */
  readonly reading: number;
  readonly quote: string;
  /** The passage that states the date; null when the date is not stated. */
  readonly sourceReference: string | null;
  readonly effectiveFrom: string | null;
  readonly note: string;
};

/**
 * official: an official document states the value for these months.
 * derived: the employee total minus the other insurance's rate, both
 * official for these months; never stated as such by any document.
 * secondary: a trusted secondary document states it.
 */
export type EvidenceRank = "official" | "derived" | "secondary";

/** One value of one parameter for [from, until), month starts. */
export type ContributionEvidence = {
  readonly parameter: ContributionParameter;
  readonly value: number;
  readonly from: string;
  readonly until: string;
  readonly rank: EvidenceRank;
  /** From the live official page: may stay open-ended. */
  readonly live: boolean;
  readonly quotes: readonly EvidenceQuote[];
};

/** A rates page or section as one source states it, read on one day. */
export type ContributionObservation = {
  readonly observedOn: string;
  readonly trust: "official" | "secondary";
  readonly live: boolean;
  readonly claims: ContributionClaims;
};

/**
 * What a rates page supports: each value from the date the page states (or
 * the month it was read in, when it states none) through the month it was
 * read in, and nothing else. A page that limits its statement ("נכון
 * ל-2020") covers no later than that; a page that says the maximum changes
 * only in January covers the maximum to the end of that year.
 */
export function observationEvidence(
  observation: ContributionObservation,
  reading: number,
): ContributionEvidence[] {
  const observedMonth = monthOf(observation.observedOn);
  return CONTRIBUTION_PARAMETERS.map((parameter) => {
    const claim = observation.claims.claims[parameter];
    let until = addMonths(observedMonth, 1);
    const annual =
      parameter === "maxInsurableIncome"
        ? observation.claims.annualMaxUpdate
        : null;
    if (annual !== null) {
      until = `${Number(observedMonth.slice(0, 4)) + 1}-01-01`;
    }
    if (claim.statedUntil !== null && claim.statedUntil < until) {
      until = claim.statedUntil;
    }
    // A value stated to start after the reading is announced, not observed.
    const from = claim.statedFrom ?? observedMonth;
    return {
      parameter,
      value: claim.value,
      from: from < until ? from : until,
      until,
      rank: observation.trust,
      live: observation.live,
      quotes: [
        {
          reading,
          quote: claim.quote,
          sourceReference: claim.statedFromQuote,
          effectiveFrom: claim.statedFrom,
          note:
            `Read as of ${observation.observedOn}.` +
            (annual ? ` The source states: "${annual}".` : ""),
        },
      ],
    };
  }).filter((evidence) => evidence.from < evidence.until);
}

/**
 * A change-point table: each row holds from its date until the next row's.
 * The newest row has no next row, and the table may not list later changes,
 * so it covers only its own month.
 */
function changePoints<T extends { readonly from: string }>(
  rows: readonly T[],
): { row: T; until: string }[] {
  return rows.map((row, index) => ({
    row,
    until: index === 0 ? addMonths(row.from, 1) : rows[index - 1].from,
  }));
}

export function thresholdEvidence(
  history: ThresholdHistory,
  reading: number,
): ContributionEvidence[] {
  const evidence: ContributionEvidence[] = [];
  for (const { row, until } of changePoints(history.rows)) {
    for (const parameter of [
      "reducedRateBoundary",
      "maxInsurableIncome",
    ] as const) {
      const value = row[parameter];
      if (value === null) continue;
      evidence.push({
        parameter,
        value,
        from: row.from,
        until,
        rank: "official",
        live: false,
        quotes: [
          {
            reading,
            quote: row.quote,
            sourceReference: row.quote,
            effectiveFrom: row.from,
            note: `Change-point table row from ${row.from}; it holds until ${until}.`,
          },
        ],
      });
    }
  }
  return evidence;
}

/** The employee total (National Insurance and health) of one part for [from, until). */
export type EmployeeTotalSpan = {
  readonly part: "reduced" | "standard";
  readonly value: number;
  readonly from: string;
  readonly until: string;
  readonly quote: EvidenceQuote;
};

export function employeeTotalSpans(
  history: EmployeeTotalHistory,
  reading: number,
): EmployeeTotalSpan[] {
  return changePoints(history.rows).flatMap(({ row, until }) =>
    (["reduced", "standard"] as const).flatMap((part) => {
      const value = row[part];
      return value === null
        ? []
        : [
            {
              part,
              value,
              from: row.from,
              until,
              quote: {
                reading,
                quote: row.quote,
                sourceReference: row.quote,
                effectiveFrom: row.from,
                note: `Employee total (National Insurance and health) of the ${part} part, change-point table row from ${row.from}; it holds until ${until}.`,
              },
            },
          ];
    }),
  );
}

/**
 * A yearly report covers its year, from the date its table states, or from
 * an earlier year it says the rates stayed the same as.
 */
export function reportEvidence(
  report: AnnualReportRates,
  reading: number,
): ContributionEvidence[] {
  const starts = [
    report.statedFrom,
    report.sameAsYear === null ? null : `${report.sameAsYear}-01-01`,
    `${report.year}-01-01`,
  ].filter((start): start is string => start !== null);
  const from = monthOf(starts.sort()[0]);
  const until = `${report.year + 1}-01-01`;
  const sourceReference = report.sameAsQuote ?? report.headerQuote;
  return (
    [
      ["healthInsuranceReducedRate", report.healthReduced],
      ["healthInsuranceStandardRate", report.healthStandard],
    ] as const
  ).map(([parameter, value]) => ({
    parameter,
    value,
    from,
    until,
    rank: "official",
    live: false,
    quotes: [
      {
        reading,
        quote: report.quote,
        sourceReference,
        effectiveFrom: from,
        note:
          `Report for ${report.year} ("${report.yearQuote}"), table "${report.headerQuote}".` +
          " Health insurance has no employer share, so its row is the employee rate.",
      },
    ],
  }));
}

const PARTS = {
  reduced: ["nationalInsuranceReducedRate", "healthInsuranceReducedRate"],
  standard: ["nationalInsuranceStandardRate", "healthInsuranceStandardRate"],
} as const;

const ratio = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

/**
 * The rate of one insurance as the employee total minus the other one's
 * rate, where official evidence states both for the same months. Only
 * official evidence is used, never another derived value.
 */
export function deriveEvidence(
  evidence: readonly ContributionEvidence[],
  totals: readonly EmployeeTotalSpan[],
): ContributionEvidence[] {
  const derived: ContributionEvidence[] = [];
  for (const total of totals) {
    const [nationalInsurance, health] = PARTS[total.part];
    for (const [known, unknown] of [
      [nationalInsurance, health],
      [health, nationalInsurance],
    ] as const) {
      for (const part of evidence) {
        if (part.rank !== "official" || part.parameter !== known) continue;
        const from = part.from > total.from ? part.from : total.from;
        const until = part.until < total.until ? part.until : total.until;
        const value = ratio(total.value - part.value);
        if (from >= until || value <= 0 || value >= 1) continue;
        derived.push({
          parameter: unknown,
          value,
          from,
          until,
          rank: "derived",
          live: false,
          quotes: [total.quote, ...part.quotes],
        });
      }
    }
  }
  return derived;
}

export type CoveredPeriod = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  /** null: until further notice (only a period the live official page supports). */
  readonly validTo: string | null;
  readonly value: number;
  readonly trust:
    "official_verified" | "official_derived" | "secondary_verified";
  /** Supporting evidence, by index. */
  readonly evidence: readonly number[];
};

export type MissingPeriod = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  readonly validTo: string;
  readonly reason: "no_evidence" | "conflicting_evidence";
};

/** Evidence of the same rank disagrees, or lower-ranked evidence disagrees with the value chosen. */
export type EvidenceConflict = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  readonly validTo: string;
  readonly between: EvidenceRank | `${EvidenceRank}_vs_${EvidenceRank}`;
  readonly values: readonly number[];
};

export type ContributionTimelines = {
  /** [from, until): the months the research covers. */
  readonly window: { readonly from: string; readonly until: string };
  readonly periods: readonly CoveredPeriod[];
  readonly missing: readonly MissingPeriod[];
  readonly conflicts: readonly EvidenceConflict[];
};

const RANKS: readonly EvidenceRank[] = ["official", "derived", "secondary"];

const TRUST_BY_RANK = {
  official: "official_verified",
  derived: "official_derived",
  secondary: "secondary_verified",
} as const satisfies Record<EvidenceRank, CoveredPeriod["trust"]>;

/**
 * One timeline per parameter, month by month: official evidence first, then
 * derived, then secondary. Months no evidence covers stay missing, even
 * between two periods of the same value; months where evidence of the
 * deciding rank disagrees are missing too.
 */
export function buildContributionTimelines(
  evidence: readonly ContributionEvidence[],
  window: { readonly from: string; readonly until: string },
): ContributionTimelines {
  const periods: CoveredPeriod[] = [];
  const missing: MissingPeriod[] = [];
  const conflicts: EvidenceConflict[] = [];

  for (const parameter of CONTRIBUTION_PARAMETERS) {
    const resolved = monthsIn(window.from, window.until).map((month) => {
      const byRank = new Map<EvidenceRank, Map<number, number[]>>(
        RANKS.map((rank) => [rank, new Map()]),
      );
      evidence.forEach((item, index) => {
        if (item.parameter !== parameter) return;
        if (month < item.from || month >= item.until) return;
        const values = byRank.get(item.rank)!;
        values.set(item.value, [...(values.get(item.value) ?? []), index]);
      });

      const rank = RANKS.find((candidate) => byRank.get(candidate)!.size > 0);
      if (rank === undefined) {
        return { month, key: "missing|no_evidence", conflict: null };
      }
      const values = byRank.get(rank)!;
      if (values.size > 1) {
        const disagreeing = [...values.keys()].sort((a, b) => a - b);
        return {
          month,
          key: "missing|conflicting_evidence",
          conflict: { between: rank, values: disagreeing },
        };
      }
      const [[value, supporting]] = values;
      const lower = RANKS.slice(RANKS.indexOf(rank) + 1).find((other) =>
        [...byRank.get(other)!.keys()].some((other) => other !== value),
      );
      return {
        month,
        key: `covered|${TRUST_BY_RANK[rank]}|${value}`,
        covered: { trust: TRUST_BY_RANK[rank], value, supporting },
        conflict:
          lower === undefined
            ? null
            : {
                between: `${lower}_vs_${rank}` as const,
                values: [value, ...byRank.get(lower)!.keys()]
                  .filter((other, i, all) => all.indexOf(other) === i)
                  .sort((a, b) => a - b),
              },
      };
    });

    for (const run of runs(resolved, (entry) => entry.key)) {
      const first = run[0];
      const validFrom = first.month;
      const validTo = addMonths(run[run.length - 1].month, 1);
      if (!("covered" in first) || first.covered === undefined) {
        missing.push({
          parameter,
          validFrom,
          validTo,
          reason:
            first.key === "missing|no_evidence"
              ? "no_evidence"
              : "conflicting_evidence",
        });
        continue;
      }
      const supporting = [
        ...new Set(
          run.flatMap((entry) =>
            "covered" in entry && entry.covered ? entry.covered.supporting : [],
          ),
        ),
      ].sort((a, b) => a - b);
      const openEnded =
        validTo === window.until &&
        supporting.some((index) => evidence[index].live);
      periods.push({
        parameter,
        validFrom,
        validTo: openEnded ? null : validTo,
        value: first.covered.value,
        trust: first.covered.trust,
        evidence: supporting,
      });
    }

    for (const run of runs(resolved, (entry) =>
      entry.conflict === null
        ? null
        : `${entry.conflict.between}|${entry.conflict.values.join(",")}`,
    )) {
      const { conflict } = run[0];
      if (conflict === null) continue;
      conflicts.push({
        parameter,
        validFrom: run[0].month,
        validTo: addMonths(run[run.length - 1].month, 1),
        between: conflict.between,
        values: conflict.values,
      });
    }
  }
  return { window, periods, missing, conflicts };
}

/** Consecutive entries with the same key; a null key separates runs. */
function runs<T>(
  entries: readonly T[],
  key: (entry: T) => string | null,
): T[][] {
  const result: T[][] = [];
  let previous: string | null = null;
  for (const entry of entries) {
    const current = key(entry);
    if (current !== null && current === previous) {
      result[result.length - 1].push(entry);
    } else {
      result.push([entry]);
    }
    previous = current;
  }
  return result;
}

export const monthOf = (day: string) => `${day.slice(0, 7)}-01`;

export function addMonths(month: string, count: number): string {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
}

function monthsIn(from: string, until: string): string[] {
  const months: string[] = [];
  for (let month = monthOf(from); month < until; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months;
}

/**
 * One pending revision per verified period, backed by every passage that
 * covers it. Missing periods produce nothing: they are reported, not filled.
 * Derived periods produce nothing either: the store has no trust level for a
 * value computed from two official ones, so they are only reported.
 */
export function contributionCandidates(
  timelines: ContributionTimelines,
  evidence: readonly ContributionEvidence[],
  readings: readonly ContributionReading[],
): NewCandidate[] {
  return timelines.periods.flatMap((period) => {
    if (period.trust === "official_derived") return [];
    const sources: CandidateSource[] = [];
    const indexByKey = new Map<string, number>();
    const add = (source: CandidateSource): number => {
      const key = `${source.url}|${source.finalUrl}|${source.sha256}`;
      const seen = indexByKey.get(key);
      if (seen !== undefined) {
        if (source.role === "supporting") {
          sources[seen] = { ...sources[seen], role: "supporting" };
        }
        return seen;
      }
      indexByKey.set(key, sources.length);
      sources.push(source);
      return sources.length - 1;
    };

    const seenQuotes = new Set<string>();
    const items: CandidateEvidence[] = [];
    for (const index of period.evidence) {
      for (const quote of evidence[index].quotes) {
        const key = `${quote.reading}|${quote.quote}|${quote.effectiveFrom}`;
        if (seenQuotes.has(key)) continue;
        seenQuotes.add(key);
        const { provenance } = readings[quote.reading];
        const indexes = provenance.sources.map(add);
        items.push({
          evidenceType: "fetched_verified",
          source: indexes[provenance.supportingSource],
          carriedFromRevisionId: null,
          quote: quote.quote,
          section: null,
          sourceReference: quote.sourceReference,
          page: null,
          effectiveFrom: quote.effectiveFrom,
          grounding: null,
          note: quote.note,
        });
      }
    }

    const fallbackReason =
      period.trust === "official_verified"
        ? null
        : (period.evidence
            .flatMap((index) => evidence[index].quotes)
            .map(({ reading }) => readings[reading].provenance.fallbackReason)
            .find((reason) => reason !== null) ?? "official_source_not_found");
    return [
      {
        kind: CONTRIBUTION_KINDS[period.parameter],
        subjectKey: null,
        validFrom: period.validFrom,
        validTo: period.validTo,
        value: contributionValue(period.parameter, period.value),
        origin: "research",
        trust: period.trust,
        fallbackReason,
        sources,
        evidence: items,
      },
    ];
  });
}

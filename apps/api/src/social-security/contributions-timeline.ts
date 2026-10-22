import type {
  CandidateEvidence,
  CandidateSource,
  NewCandidate,
  RevisionFallbackReason,
} from "../reference-data/ports.ts";
import {
  CONTRIBUTION_KINDS,
  CONTRIBUTION_PARAMETERS,
  contributionValue,
  type ContributionClaims,
  type ContributionParameter,
} from "./employee-contributions.ts";

/** What one source said, and when it was read. */
export type ContributionObservation = {
  /** The day the source showed these values (capture day for archives). */
  readonly observedOn: string;
  readonly trust: "official" | "secondary";
  /** The live official page: its values hold until a newer reading says otherwise. */
  readonly live: boolean;
  readonly claims: ContributionClaims;
};

export type CoveredPeriod = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  /** null: until further notice (only a period the live official page supports). */
  readonly validTo: string | null;
  readonly value: number;
  readonly trust: "official_verified" | "secondary_verified";
  /** Observations whose claims cover it, by index. */
  readonly observations: readonly number[];
};

export type MissingPeriod = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  readonly validTo: string;
  readonly reason: "no_evidence" | "conflicting_evidence";
};

/** Sources of the same rank disagree, or a secondary source disagrees with an official one. */
export type EvidenceConflict = {
  readonly parameter: ContributionParameter;
  readonly validFrom: string;
  readonly validTo: string;
  readonly between: "official" | "secondary" | "secondary_vs_official";
  readonly values: readonly number[];
};

export type ContributionTimelines = {
  /** [from, until): the months the research covers. */
  readonly window: { readonly from: string; readonly until: string };
  readonly periods: readonly CoveredPeriod[];
  readonly missing: readonly MissingPeriod[];
  readonly conflicts: readonly EvidenceConflict[];
};

/**
 * Turns readings into one timeline per parameter, month by month. A reading
 * covers its value from the date the source states (or the month it was read
 * in, when it states none) through the month it was read in, and nothing
 * else; a source that limits its statement ("נכון ל-2020") covers no later
 * than that. The one extension is a source's own rule: a page that says the
 * maximum insurable income changes only in January covers that value to the
 * end of the year it was read in. Months no reading covers stay missing, even
 * between two readings of the same value; months where readings of the same
 * rank disagree are missing too. Secondary readings only fill months without
 * any official one.
 */
export function buildContributionTimelines(
  observations: readonly ContributionObservation[],
  window: { readonly from: string; readonly until: string },
): ContributionTimelines {
  const periods: CoveredPeriod[] = [];
  const missing: MissingPeriod[] = [];
  const conflicts: EvidenceConflict[] = [];

  for (const parameter of CONTRIBUTION_PARAMETERS) {
    const months = monthsIn(window.from, window.until).map((month) => ({
      month,
      official: new Map<number, number[]>(),
      secondary: new Map<number, number[]>(),
    }));
    observations.forEach((observation, index) => {
      const { from, until } = coverage(observation, parameter);
      const { value } = observation.claims.claims[parameter];
      for (const entry of months) {
        if (entry.month < from || entry.month >= until) continue;
        const byValue = entry[observation.trust];
        byValue.set(value, [...(byValue.get(value) ?? []), index]);
      }
    });

    type Resolved =
      | {
          kind: "covered";
          trust: CoveredPeriod["trust"];
          value: number;
          observations: number[];
        }
      | { kind: "missing"; reason: MissingPeriod["reason"] };
    const resolved = months.map(({ month, official, secondary }) => {
      let outcome: Resolved;
      let conflict: EvidenceConflict["between"] | null = null;
      let values: number[] = [];
      if (official.size === 1) {
        const [[value, supporting]] = official;
        outcome = {
          kind: "covered",
          trust: "official_verified",
          value,
          observations: supporting,
        };
        if ([...secondary.keys()].some((other) => other !== value)) {
          conflict = "secondary_vs_official";
          values = [value, ...secondary.keys()];
        }
      } else if (official.size > 1) {
        outcome = { kind: "missing", reason: "conflicting_evidence" };
        conflict = "official";
        values = [...official.keys()];
      } else if (secondary.size === 1) {
        const [[value, supporting]] = secondary;
        outcome = {
          kind: "covered",
          trust: "secondary_verified",
          value,
          observations: supporting,
        };
      } else if (secondary.size > 1) {
        outcome = { kind: "missing", reason: "conflicting_evidence" };
        conflict = "secondary";
        values = [...secondary.keys()];
      } else {
        outcome = { kind: "missing", reason: "no_evidence" };
      }
      return { month, outcome, conflict, values: [...new Set(values)].sort() };
    });

    for (const run of runs(resolved, (entry) =>
      entry.outcome.kind === "covered"
        ? `covered|${entry.outcome.trust}|${entry.outcome.value}`
        : `missing|${entry.outcome.reason}`,
    )) {
      const first = run[0];
      const validFrom = first.month;
      const validTo = addMonths(run[run.length - 1].month, 1);
      if (first.outcome.kind === "missing") {
        missing.push({
          parameter,
          validFrom,
          validTo,
          reason: first.outcome.reason,
        });
        continue;
      }
      const supporting = [
        ...new Set(
          run.flatMap((entry) =>
            entry.outcome.kind === "covered" ? entry.outcome.observations : [],
          ),
        ),
      ].sort((a, b) => a - b);
      const openEnded =
        validTo === window.until &&
        supporting.some((index) => observations[index].live);
      periods.push({
        parameter,
        validFrom,
        validTo: openEnded ? null : validTo,
        value: first.outcome.value,
        trust: first.outcome.trust,
        observations: supporting,
      });
    }

    for (const run of runs(resolved, (entry) =>
      entry.conflict === null
        ? null
        : `${entry.conflict}|${entry.values.join(",")}`,
    )) {
      const first = run[0];
      if (first.conflict === null) continue;
      conflicts.push({
        parameter,
        validFrom: first.month,
        validTo: addMonths(run[run.length - 1].month, 1),
        between: first.conflict,
        values: first.values,
      });
    }
  }
  return { window, periods, missing, conflicts };
}

/** [from, until) of the months one reading supports for one parameter. */
function coverage(
  observation: ContributionObservation,
  parameter: ContributionParameter,
): { from: string; until: string } {
  const observedMonth = monthOf(observation.observedOn);
  const { statedFrom, statedUntil } = observation.claims.claims[parameter];
  let until = addMonths(observedMonth, 1);
  if (
    parameter === "maxInsurableIncome" &&
    observation.claims.annualMaxUpdate !== null
  ) {
    until = `${Number(observedMonth.slice(0, 4)) + 1}-01-01`;
  }
  if (statedUntil !== null && statedUntil < until) until = statedUntil;
  // A value stated to start after the reading is announced, not observed.
  const from = statedFrom ?? observedMonth;
  return from < until ? { from, until } : { from: until, until };
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

/** Where an observation's values were read, for the revision's provenance. */
export type ObservationProvenance = {
  readonly sources: readonly CandidateSource[];
  /** Index into `sources` of the document the values were read from. */
  readonly supportingSource: number;
  /** Why the values do not come from an official source; null when they do. */
  readonly fallbackReason: RevisionFallbackReason | null;
};

export type ResearchedObservation = ContributionObservation & {
  readonly provenance: ObservationProvenance;
};

/**
 * One pending revision per covered period, backed by every reading that
 * covers it. Missing periods produce nothing: they are reported, not filled.
 */
export function contributionCandidates(
  timelines: ContributionTimelines,
  observations: readonly ResearchedObservation[],
): NewCandidate[] {
  return timelines.periods.map((period) => {
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

    const evidence = period.observations.map((index): CandidateEvidence => {
      const observation = observations[index];
      const { provenance } = observation;
      const indexes = provenance.sources.map(add);
      const claim = observation.claims.claims[period.parameter];
      const annual =
        period.parameter === "maxInsurableIncome"
          ? observation.claims.annualMaxUpdate
          : null;
      return {
        evidenceType: "fetched_verified",
        source: indexes[provenance.supportingSource],
        carriedFromRevisionId: null,
        quote: claim.quote,
        section: null,
        sourceReference: claim.statedFromQuote,
        page: null,
        effectiveFrom: claim.statedFrom,
        grounding: null,
        note:
          `Read as of ${observation.observedOn}.` +
          (annual ? ` The source states: "${annual}".` : ""),
      };
    });

    const fallbackReason =
      period.trust === "official_verified"
        ? null
        : (period.observations
            .map((index) => observations[index].provenance.fallbackReason)
            .find((reason) => reason !== null) ?? "official_source_not_found");
    return {
      kind: CONTRIBUTION_KINDS[period.parameter],
      subjectKey: null,
      validFrom: period.validFrom,
      validTo: period.validTo,
      value: contributionValue(period.parameter, period.value),
      origin: "research",
      trust: period.trust,
      fallbackReason,
      sources,
      evidence,
    };
  });
}

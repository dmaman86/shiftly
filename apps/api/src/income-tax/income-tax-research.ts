import {
  uncoveredKinds,
  yearCoverage,
  type KindCoverage,
} from "../reference-data/coverage.ts";
import type {
  NewCandidate,
  ReferenceKind,
  RevisionRepository,
} from "../reference-data/ports.ts";
import {
  storeCandidates,
  type PersistenceOutcome,
} from "../reference-data/store-candidates.ts";
import { candidateProvenance } from "../research/candidate-provenance.ts";
import {
  researchReferenceData,
  type ResearchDeps,
  type ResearchResult,
  type ResearchSpec,
} from "../research/research-pipeline.ts";
import { incomeTaxResearchTask } from "./research-task.ts";
import {
  validateIncomeTaxResearch,
  type Evidence,
  type IncomeTaxResearchValues,
} from "./research-validation.ts";

/**
 * The Tax Authority's monthly deductions booklet. From 2022 the file name
 * follows this pattern (verified for 2022–2026; HEAD is unreliable there, so
 * the fetcher uses GET). Earlier years have irregular names: discovery
 * finds them. The pattern only proposes a URL; the content decides.
 */
const BOOKLET_URL =
  "https://www.gov.il/BlobFolder/generalpage/income-tax-monthly-deductions-booklet/he/generalInformation_income-tax-monthly-deductions-booklet_monthly-deductions-booklet-{year}.pdf";
const FIRST_PATTERN_YEAR = 2022;

export const INCOME_TAX_RESEARCH: ResearchSpec<IncomeTaxResearchValues> = {
  knownSources: (year) =>
    year >= FIRST_PATTERN_YEAR
      ? [BOOKLET_URL.replace("{year}", String(year))]
      : [],
  discoverySubject:
    "the Israel Tax Authority monthly income tax deductions booklet (לוח ניכויים חודשי / לוח עזר לחישוב מס הכנסה ממשכורת), which states the monthly income tax brackets and the monthly credit point value (נקודת זיכוי)",
  pageKeywords: ["מדרגות", "נקודת זיכוי"],
  task: incomeTaxResearchTask,
  validate: validateIncomeTaxResearch,
};

const INCOME_TAX_KINDS: readonly ReferenceKind[] = [
  "income_tax.monthly_brackets",
  "income_tax.credit_point",
];

export type IncomeTaxResearchResponse = {
  readonly year: number;
  readonly coverage: readonly KindCoverage[];
  /** null when every kind was already covered: no model call was made. */
  readonly research: ResearchResult<IncomeTaxResearchValues> | null;
  readonly persistence: PersistenceOutcome;
};

/**
 * Researches the year only if a kind has nothing active or pending for it,
 * then stores the validated values of the uncovered kinds as pending
 * revisions. One booklet states both kinds, so research is all or nothing.
 */
export async function researchAndStoreIncomeTax(
  year: number,
  deps: ResearchDeps & { readonly revisions: RevisionRepository | null },
): Promise<IncomeTaxResearchResponse> {
  const coverage = await yearCoverage(deps.revisions, INCOME_TAX_KINDS, year);
  const uncovered = uncoveredKinds(coverage);
  if (uncovered.size === 0) {
    return {
      year,
      coverage,
      research: null,
      persistence: { status: "nothing_to_store" },
    };
  }

  const research = await researchReferenceData(year, INCOME_TAX_RESEARCH, deps);
  const persistence = await storeCandidates(
    deps.revisions,
    incomeTaxCandidates(research).filter(({ kind }) => uncovered.has(kind)),
  );
  return { year, coverage, research, persistence };
}

/** One candidate per kind, both backed by the passage they were read from. */
export function incomeTaxCandidates(
  result: ResearchResult<IncomeTaxResearchValues>,
): NewCandidate[] {
  const provenance = candidateProvenance(result);
  if (result.candidate === null || provenance === null) return [];
  const { monthlyBrackets, monthlyCreditPoint } = result.candidate.values;
  const { sources, supportingSource, trust, fallbackReason } = provenance;
  const candidate = (
    kind: NewCandidate["kind"],
    value: unknown,
    evidence: Evidence,
  ): NewCandidate => ({
    kind,
    subjectKey: null,
    validFrom: evidence.effectiveFrom,
    validTo: null,
    value,
    origin: "research",
    trust,
    fallbackReason,
    sources,
    evidence: [
      {
        evidenceType: "fetched_verified",
        source: supportingSource,
        carriedFromRevisionId: null,
        quote: evidence.quote,
        section: evidence.section,
        sourceReference: evidence.sourceReference,
        page: evidence.page,
        effectiveFrom: evidence.effectiveFrom,
        grounding: null,
        note: null,
      },
    ],
  });
  return [
    candidate(
      "income_tax.monthly_brackets",
      { brackets: monthlyBrackets.value },
      monthlyBrackets,
    ),
    candidate(
      "income_tax.credit_point",
      { monthlyValue: monthlyCreditPoint.value },
      monthlyCreditPoint,
    ),
  ];
}

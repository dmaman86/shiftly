import {
  ResearchError,
  type ResearchDomain,
  type ResearchSpec,
} from "./contracts.ts";
import { ELECTION_RESEARCH_SPEC } from "./elections/election-spec.ts";
import { INCOME_TAX_RESEARCH_SPEC } from "./income-tax/income-tax-spec.ts";

/** Registration does not enable execution: the explicit environment opt-in remains required. */
export const researchSpecs: readonly ResearchSpec[] = [
  ELECTION_RESEARCH_SPEC,
  INCOME_TAX_RESEARCH_SPEC,
];

export const selectResearchSpec = (
  domain: ResearchDomain,
  specs: readonly ResearchSpec[] = researchSpecs,
): ResearchSpec => {
  const matching = specs.filter((spec) => spec.domain === domain);
  if (matching.length !== 1) throw new ResearchError("research_unavailable");
  return matching[0];
};

/** Plan-only defaults, not an executable domain spec or an approved refresh scheduler. */
export const planningSpec = (domain: ResearchDomain): ResearchSpec =>
  researchSpecs.find((spec) => spec.domain === domain) ?? {
    id: `reference:${domain}`,
    version: 1,
    domain,
    population: "Domain spec not registered",
    sourcePriority: [],
    researchInstructions: "Not enabled",
    refreshPolicy: {
      intervalDays:
        domain === "elections" ? 7 : domain === "income-tax" ? 90 : 30,
      unresolvedDays: 30,
    },
    validateFinding: () => ["Domain spec not registered"],
  };

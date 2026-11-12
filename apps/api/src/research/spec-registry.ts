import {
  ResearchError,
  type ResearchDomain,
  type ResearchSpec,
} from "./contracts.ts";

/** PR B/C/D register domain-validated specs here. No domain is operational in PR A. */
export const researchSpecs: readonly ResearchSpec[] = [];

export const selectResearchSpec = (
  domain: ResearchDomain,
  specs: readonly ResearchSpec[] = researchSpecs,
): ResearchSpec => {
  const matching = specs.filter((spec) => spec.domain === domain);
  if (matching.length !== 1) throw new ResearchError("research_unavailable");
  return matching[0];
};

/** Plan-only defaults, not an executable domain spec or an approved refresh scheduler. */
export const planningSpec = (domain: ResearchDomain): ResearchSpec => ({
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
});

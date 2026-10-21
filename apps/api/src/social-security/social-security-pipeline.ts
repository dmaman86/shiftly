import type { DebugArtifactStore } from "../shared/debug-artifacts.ts";
import { RulesPipelineError } from "../shared/errors.ts";
import type { Extractor } from "../shared/gemma-extractor.ts";
import {
  extractWithTrace,
  recordingErrors,
  resolvedFrom,
  type Resolved,
} from "../shared/pipeline.ts";
import { resolveForYear } from "../shared/year-resolution.ts";
import { EMPLOYEE_CONTRIBUTIONS_TASK } from "./extraction-tasks.ts";
import {
  validateEmployeeContributionsExtraction,
  type EmployeeContributionRules,
} from "./social-security.schema.ts";
import type { SocialSecuritySourceProvider } from "./social-security-source.ts";

export type SocialSecurityPipelineDeps = {
  readonly source: SocialSecuritySourceProvider;
  readonly extractor: Extractor;
  readonly artifacts: DebugArtifactStore;
  /** Decides the reference date of the current year. */
  readonly now?: () => Date;
};

export type SocialSecurityRulesResult = {
  readonly year: number;
  readonly employeeContributions: Resolved<EmployeeContributionRules>;
  /** The date the source was read as of. */
  readonly referenceDate: string;
  readonly extraction: {
    readonly model: string;
    readonly attempts: number;
    readonly extractedAt: string;
  };
};

/**
 * July 1 of the year, when the January update is long published; today for
 * the current year before July, or for a future year.
 */
export function referenceDate(year: number, now: Date): Date {
  const midYear = new Date(Date.UTC(year, 6, 1));
  return midYear < now ? midYear : now;
}

/**
 * year → reference date → source text as it read then → model → validated
 * rules → value for that year (or the latest earlier one the text states).
 * Each step either succeeds or stops the run with a RulesPipelineError.
 */
export async function extractSocialSecurityRules(
  year: number,
  deps: SocialSecurityPipelineDeps,
): Promise<SocialSecurityRulesResult> {
  const at = referenceDate(year, (deps.now ?? (() => new Date()))());
  const document = await deps.source.employeeContributionsAt(at);
  const artifacts = await deps.artifacts.forDocument(
    year,
    [document.ref, ...document.includes].map((ref) => ref.revisionId).join("-"),
  );
  await artifacts.write("employee-contributions.wikitext", document.text);

  return recordingErrors(artifacts, async () => {
    const extraction = await extractWithTrace(
      deps.extractor,
      artifacts,
      EMPLOYEE_CONTRIBUTIONS_TASK,
      document,
    );
    const { asOfYear, rules } = validateEmployeeContributionsExtraction(
      extraction.raw,
      document.text,
    );
    const resolution = resolveForYear(
      [{ fromYear: asOfYear, toYear: asOfYear, value: rules }],
      year,
    );
    if (resolution === null) {
      throw new RulesPipelineError(
        "year_not_covered",
        `The source as of ${at.toISOString().slice(0, 10)} states values for ${asOfYear}, not ${year}`,
        { asOfYear, revisionId: document.ref.revisionId },
      );
    }

    const result: SocialSecurityRulesResult = {
      year,
      employeeContributions: resolvedFrom(resolution, document),
      referenceDate: at.toISOString(),
      extraction: {
        model: extraction.trace.model,
        attempts: extraction.trace.attempts.length,
        extractedAt: new Date().toISOString(),
      },
    };
    await artifacts.write("result.json", JSON.stringify(result, null, 2));
    return result;
  });
}

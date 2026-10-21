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
import { BRACKETS_TASK, CREDIT_POINT_TASK } from "./extraction-tasks.ts";
import {
  validateBracketExtraction,
  validateCreditPointExtraction,
  type MonthlyTaxBracket,
} from "./income-tax-extraction.schema.ts";
import type { IncomeTaxSourceProvider } from "./income-tax-source.ts";

export type IncomeTaxPipelineDeps = {
  readonly source: IncomeTaxSourceProvider;
  readonly extractor: Extractor;
  readonly artifacts: DebugArtifactStore;
};

export type IncomeTaxRulesResult = {
  readonly year: number;
  readonly monthlyBrackets: Resolved<readonly MonthlyTaxBracket[]>;
  readonly monthlyCreditPointValue: Resolved<number>;
  readonly extraction: {
    readonly model: string;
    readonly attempts: {
      readonly brackets: number;
      readonly credit_point: number;
    };
    readonly extractedAt: string;
  };
};

/**
 * year → bracket table for that year (or the latest earlier one) → model →
 * validated brackets; credit point table → model → validated rows → value for
 * that year (or the latest earlier one). Each step either succeeds or stops
 * the run with a RulesPipelineError.
 */
export async function extractIncomeTaxRules(
  year: number,
  deps: IncomeTaxPipelineDeps,
): Promise<IncomeTaxRulesResult> {
  const index = await deps.source.bracketTableIndex();
  const table = resolveForYear(
    index.entries.map((entry) => ({ ...entry, value: entry.title })),
    year,
  );
  if (table === null) {
    throw new RulesPipelineError(
      "year_not_covered",
      `No bracket table for ${year} or any earlier year`,
      { indexRevisionId: index.ref.revisionId },
    );
  }

  const bracketDocument = await deps.source.bracketTable(table.value);
  const creditPointDocument = await deps.source.creditPointTable();
  const artifacts = await deps.artifacts.forDocument(
    year,
    `${bracketDocument.ref.revisionId}-${creditPointDocument.ref.revisionId}`,
  );
  await artifacts.write("brackets.wikitext", bracketDocument.text);
  await artifacts.write("credit-point.wikitext", creditPointDocument.text);

  return recordingErrors(artifacts, async () => {
    const bracketExtraction = await extractWithTrace(
      deps.extractor,
      artifacts,
      BRACKETS_TASK,
      bracketDocument,
    );
    const monthlyBrackets = validateBracketExtraction(
      bracketExtraction.raw,
      bracketDocument.text,
    );

    const creditPointExtraction = await extractWithTrace(
      deps.extractor,
      artifacts,
      CREDIT_POINT_TASK,
      creditPointDocument,
    );
    const creditPointRows = validateCreditPointExtraction(
      creditPointExtraction.raw,
      creditPointDocument.text,
    );
    const creditPoint = resolveForYear(
      creditPointRows.map((row) => ({
        fromYear: row.year,
        toYear: row.year,
        value: row.monthlyValue,
      })),
      year,
    );
    if (creditPoint === null) {
      throw new RulesPipelineError(
        "year_not_covered",
        `No credit point value for ${year} or any earlier year`,
        { revisionId: creditPointDocument.ref.revisionId },
      );
    }

    const result: IncomeTaxRulesResult = {
      year,
      monthlyBrackets: resolvedFrom(
        { ...table, value: monthlyBrackets },
        bracketDocument,
      ),
      monthlyCreditPointValue: resolvedFrom(creditPoint, creditPointDocument),
      extraction: {
        model: bracketExtraction.trace.model,
        attempts: {
          brackets: bracketExtraction.trace.attempts.length,
          credit_point: creditPointExtraction.trace.attempts.length,
        },
        extractedAt: new Date().toISOString(),
      },
    };
    await artifacts.write("result.json", JSON.stringify(result, null, 2));
    return result;
  });
}

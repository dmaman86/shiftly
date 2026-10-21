import type { DebugArtifactWriter } from "./debug-artifacts.ts";
import { RulesPipelineError } from "./errors.ts";
import type { ExtractionTask } from "./extraction-task.ts";
import {
  isLlmTrace,
  type ExtractionResult,
  type Extractor,
  type LlmTrace,
} from "./gemma-extractor.ts";
import type { SourceDocument, SourceRef } from "./source.ts";
import type { YearResolution } from "./year-resolution.ts";

/** A value for the requested year, how it was resolved, and the revisions to cite. */
export type Resolved<T> = YearResolution<T> & {
  readonly source: SourceRef;
  /** Other revisions whose content went into the source text. */
  readonly includes: readonly SourceRef[];
};

export function resolvedFrom<T>(
  resolution: YearResolution<T>,
  document: SourceDocument,
): Resolved<T> {
  return { ...resolution, source: document.ref, includes: document.includes };
}

/** Saves every model attempt to llm-<task>.json, whether the extraction succeeds or not. */
export async function extractWithTrace(
  extractor: Extractor,
  artifacts: DebugArtifactWriter,
  task: ExtractionTask,
  document: SourceDocument,
): Promise<ExtractionResult> {
  const writeTrace = (trace: LlmTrace) =>
    artifacts.write(`llm-${task.name}.json`, JSON.stringify(trace, null, 2));
  try {
    const extraction = await extractor.extract(task, document);
    await writeTrace(extraction.trace);
    return extraction;
  } catch (error) {
    if (error instanceof RulesPipelineError && isLlmTrace(error.details)) {
      await writeTrace(error.details);
    }
    throw error;
  }
}

/** Runs `run`; a pipeline error is saved as error.json before it propagates. */
export async function recordingErrors<T>(
  artifacts: DebugArtifactWriter,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof RulesPipelineError) {
      await artifacts.write(
        "error.json",
        JSON.stringify(
          { code: error.code, message: error.message, details: error.details },
          null,
          2,
        ),
      );
    }
    throw error;
  }
}

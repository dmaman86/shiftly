import type { ExtractionTask } from "../shared/extraction-task.ts";
import type { ExtractionResult, Extractor } from "../shared/gemma-extractor.ts";
import type { ExtractionProvider, FetchedDocument } from "./ports.ts";

/**
 * Extraction from backend-fetched text only. Reuses the existing extractor
 * (no web tools, temperature 0, JSON schema, retries on provider errors).
 */
export class GoogleGemmaExtractionProvider implements ExtractionProvider {
  private readonly extractor: Extractor;

  constructor(extractor: Extractor) {
    this.extractor = extractor;
  }

  extract(
    task: ExtractionTask,
    document: FetchedDocument,
  ): Promise<ExtractionResult> {
    return this.extractor.extract(task, {
      format: document.format ?? "plain-text",
      text: document.text,
      // The URL, not the page title: titles can be stale (seen in a 2026 PDF).
      ref: { title: document.finalUrl },
    });
  }
}

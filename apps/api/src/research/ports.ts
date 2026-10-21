import type { ExtractionTask } from "../shared/extraction-task.ts";
import type { ExtractionResult } from "../shared/gemma-extractor.ts";

/**
 * The research boundary: the model decides what to investigate, the backend
 * decides what content exists, the model extracts from that content, and code
 * decides whether to trust it. A URL alone is never evidence.
 */

/** 1 official, 2 official mirror or cache, 3 trusted secondary, 4 general web. */
export type SourceTier = 1 | 2 | 3 | 4;

export type ResearchDiscoveryRequest = {
  /** What to look for, in plain words; never asks the model for values. */
  readonly subject: string;
  readonly year: number;
};

export type DiscoveredSource = {
  /** The real page address; search redirects are already resolved. */
  readonly url: string;
  readonly title: string | null;
  /** Where the URL came from: search metadata, or the answer text as a fallback. */
  readonly origin: "grounding_metadata" | "response_text";
};

export type ModelCall = {
  readonly model: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly outcome: "response" | "provider_error";
  readonly httpStatus: number | null;
  readonly error: string | null;
};

export type ResearchDiscoveryResult = {
  readonly sources: readonly DiscoveredSource[];
  readonly searchQueries: readonly string[];
  readonly call: ModelCall;
  /** The answer text, kept for the trace only; its values are never used. */
  readonly rawText: string | null;
};

export interface ResearchProvider {
  discover(request: ResearchDiscoveryRequest): Promise<ResearchDiscoveryResult>;
}

export type Accessibility =
  /** 2xx with content the backend can read. */
  | "accessible"
  /** 401/403/429 or a bot challenge. Never bypassed. */
  | "blocked"
  | "not_found"
  /** 2xx, but a content type the backend cannot read. */
  | "unsupported_content"
  | "error";

/** Exactly what the backend downloaded, and the text it made from it. */
export type FetchedDocument = {
  readonly requestedUrl: string;
  readonly finalUrl: string;
  /** null when no response arrived. */
  readonly httpStatus: number | null;
  readonly contentType: string | null;
  readonly publisher: string;
  /** From the page itself; a label only, never trusted for dates or years. */
  readonly title: string | null;
  readonly retrievedAt: string;
  /** SHA-256 of the downloaded bytes, hex; null when nothing was downloaded. */
  readonly sha256: string | null;
  readonly accessibility: Accessibility;
  /** Why the document is not accessible; null when it is. */
  readonly problem: string | null;
  readonly format: "pdf-text" | "html-text" | "plain-text" | null;
  /** Normalized text; empty unless accessible. PDFs carry "[page N]" markers. */
  readonly text: string;
  /** Downloaded bytes, for the debug artifacts only. */
  readonly bytes: Uint8Array | null;
};

export interface DocumentFetcher {
  fetch(url: string): Promise<FetchedDocument>;
}

export interface ExtractionProvider {
  extract(
    task: ExtractionTask,
    document: FetchedDocument,
  ): Promise<ExtractionResult>;
}

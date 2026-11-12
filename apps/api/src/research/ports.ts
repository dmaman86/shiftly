/** Document/evidence ports for explicit manual source verification, not model research. */

/** 1 official, 2 official mirror or cache, 3 trusted secondary, 4 general web. */
export type SourceTier = 1 | 2 | 3 | 4;

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
  /** Downloaded source bytes, when available. */
  readonly bytes: Uint8Array | null;
};

export interface DocumentFetcher {
  fetch(url: string): Promise<FetchedDocument>;
}

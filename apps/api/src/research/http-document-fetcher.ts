import { createHash } from "node:crypto";
import { htmlToText, pdfToText, type DocumentText } from "./document-text.ts";
import type {
  Accessibility,
  DocumentFetcher,
  FetchedDocument,
} from "./ports.ts";
import { publisherOf } from "./source-policy.ts";

/** Honest identification; the fetcher never imitates a browser. */
export const USER_AGENT =
  "shiftly-api/0.0 (indicative salary calculator; local use)";

const TIMEOUT_MS = 30_000;
const MAX_BYTES = 25 * 1024 * 1024;
const BLOCKED_STATUSES = new Set([401, 403, 429]);
const NOT_FOUND_STATUSES = new Set([404, 410]);

type Fetch = typeof fetch;

/**
 * Downloads one URL and turns it into text the extractor can read. A blocked
 * or challenged response is reported as "blocked" and left alone: no retries
 * with other clients, no challenge solving.
 */
export class HttpDocumentFetcher implements DocumentFetcher {
  private readonly fetchImpl: Fetch;
  private readonly now: () => Date;

  constructor(
    options: {
      /** Test seams. */
      fetch?: Fetch;
      now?: () => Date;
    } = {},
  ) {
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async fetch(url: string): Promise<FetchedDocument> {
    const retrievedAt = this.now().toISOString();
    const empty = {
      requestedUrl: url,
      finalUrl: url,
      httpStatus: null,
      contentType: null,
      publisher: publisherOf(url),
      title: null,
      retrievedAt,
      sha256: null,
      format: null,
      text: "",
      bytes: null,
    } as const;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      return { ...empty, accessibility: "error", problem: messageOf(cause) };
    }

    const finalUrl = response.url || url;
    const contentType = response.headers.get("content-type");
    const base = {
      ...empty,
      finalUrl,
      httpStatus: response.status,
      contentType,
      publisher: publisherOf(finalUrl),
    };
    const unread = (accessibility: Accessibility, problem: string) => {
      void response.body?.cancel();
      return { ...base, accessibility, problem };
    };

    if (
      BLOCKED_STATUSES.has(response.status) ||
      response.headers.has("cf-mitigated")
    ) {
      return unread("blocked", `HTTP ${response.status}`);
    }
    if (NOT_FOUND_STATUSES.has(response.status)) {
      return unread("not_found", `HTTP ${response.status}`);
    }
    if (!response.ok) return unread("error", `HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      return unread("error", "document too large");
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch (cause) {
      return { ...base, accessibility: "error", problem: messageOf(cause) };
    }
    if (bytes.byteLength > MAX_BYTES) {
      return { ...base, accessibility: "error", problem: "document too large" };
    }
    const downloaded = {
      ...base,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes,
    };

    const format = formatOf(contentType, bytes);
    if (format === null) {
      return {
        ...downloaded,
        accessibility: "unsupported_content",
        problem: `content type ${contentType ?? "unknown"}`,
      };
    }

    let parsed: DocumentText;
    try {
      parsed = await toText(format, bytes);
    } catch (cause) {
      return {
        ...downloaded,
        format,
        accessibility: "unsupported_content",
        problem: `unreadable ${format}: ${messageOf(cause)}`,
      };
    }
    if (parsed.text.trim().length === 0) {
      // A scanned PDF has no text layer; there is no OCR in this slice.
      return {
        ...downloaded,
        format,
        title: parsed.title,
        accessibility: "unsupported_content",
        problem: "no text content",
      };
    }
    return {
      ...downloaded,
      format,
      title: parsed.title,
      text: parsed.text,
      accessibility: "accessible",
      problem: null,
    };
  }
}

function formatOf(
  contentType: string | null,
  bytes: Uint8Array,
): FetchedDocument["format"] {
  const type = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  const pdfMagic = new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  if (type === "application/pdf" || pdfMagic) return "pdf-text";
  if (type === "text/html" || type === "application/xhtml+xml") {
    return "html-text";
  }
  if (type === "text/plain") return "plain-text";
  return null;
}

function toText(
  format: NonNullable<FetchedDocument["format"]>,
  bytes: Uint8Array,
): Promise<DocumentText> | DocumentText {
  if (format === "pdf-text") return pdfToText(bytes);
  const decoded = new TextDecoder().decode(bytes);
  return format === "html-text"
    ? htmlToText(decoded)
    : { text: decoded.trim(), title: null };
}

function messageOf(cause: unknown): string {
  return (cause instanceof Error ? cause.message : String(cause)).slice(0, 300);
}

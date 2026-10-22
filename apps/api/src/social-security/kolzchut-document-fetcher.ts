import { createHash } from "node:crypto";
import type {
  Accessibility,
  DocumentFetcher,
  FetchedDocument,
} from "../research/ports.ts";
import { publisherOf } from "../research/source-policy.ts";
import { RulesPipelineError } from "../shared/errors.ts";
import type { SocialSecuritySourceProvider } from "./social-security-source.ts";

const BLOCKED_STATUSES = new Set([401, 403, 429]);

/**
 * Kol Zchut's employee deductions section as it read on one day, served to
 * the generic research pipeline as a fetched document. A page URL is not
 * enough here: the live page renders its data templates with today's
 * values, so the article and data page revisions of that day are rendered
 * instead (see kolzchut-templates.ts). The final URL is the article
 * revision's permanent link, and the title lists the data page revisions.
 */
export class KolZchutDocumentFetcher implements DocumentFetcher {
  private readonly source: SocialSecuritySourceProvider;
  private readonly at: Date;
  private readonly now: () => Date;

  constructor(
    source: SocialSecuritySourceProvider,
    at: Date,
    now: () => Date = () => new Date(),
  ) {
    this.source = source;
    this.at = at;
    this.now = now;
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

    try {
      const document = await this.source.employeeContributionsAt(this.at);
      const bytes = new TextEncoder().encode(document.text);
      const day = this.at.toISOString().slice(0, 10);
      const dataPages = document.includes
        .map((page) => `${page.title}@${page.revisionId}`)
        .join(", ");
      return {
        ...empty,
        finalUrl: document.ref.url,
        httpStatus: 200,
        contentType: "text/x-wiki; rendered",
        publisher: publisherOf(document.ref.url),
        title: `${document.ref.title} as of ${day} (data pages: ${dataPages || "none"})`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        accessibility: "accessible",
        problem: null,
        format: "plain-text",
        text: document.text,
        bytes,
      };
    } catch (error) {
      if (!(error instanceof RulesPipelineError)) throw error;
      const status = (error.details as { status?: unknown } | undefined)
        ?.status;
      return {
        ...empty,
        httpStatus: typeof status === "number" ? status : null,
        accessibility: accessibilityOf(error, status),
        problem: error.message,
      };
    }
  }
}

function accessibilityOf(
  error: RulesPipelineError,
  status: unknown,
): Accessibility {
  if (typeof status === "number" && BLOCKED_STATUSES.has(status)) {
    return "blocked";
  }
  if (error.code === "year_not_covered") return "not_found";
  if (error.code === "source_format_changed") return "unsupported_content";
  return "error";
}

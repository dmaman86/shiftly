import { RulesPipelineError } from "./errors.ts";
import type { SourceLicense, SourceRef } from "./source.ts";

export type PageRevision = {
  readonly title: string;
  readonly revisionId: number;
  readonly timestamp: string;
  readonly wikitext: string;
  readonly ref: SourceRef;
};

export type MediaWikiSite = {
  /** api.php endpoint. */
  readonly apiUrl: string;
  /** index.php endpoint, used for permanent revision links. */
  readonly indexUrl: string;
  readonly license: SourceLicense;
};

// Wikimedia asks API clients for a User-Agent that identifies them.
const USER_AGENT = "shiftly-api/0.0 (indicative salary calculator; local use)";
const REQUEST_TIMEOUT_MS = 15_000;

/** Reads page revisions from a MediaWiki site: the latest, or the one in effect at a date. */
export class MediaWikiClient {
  private readonly site: MediaWikiSite;
  private readonly fetch: typeof fetch;
  private readonly now: () => Date;

  constructor(
    site: MediaWikiSite,
    options: {
      /** Test seams. */
      fetch?: typeof fetch;
      now?: () => Date;
    } = {},
  ) {
    this.site = site;
    this.fetch = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  /** The latest revision of `title` saved at or before `at` (default: the current one). */
  async revisionAt(title: string, at?: Date): Promise<PageRevision> {
    const params = new URLSearchParams({
      action: "query",
      prop: "revisions",
      titles: title,
      rvlimit: "1",
      rvprop: "ids|timestamp|content",
      rvslots: "main",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });
    if (at) {
      params.set("rvstart", at.toISOString());
      params.set("rvdir", "older");
    }

    const body = await this.request(params, title);
    const page = (
      body as {
        query?: {
          pages?: {
            title?: string;
            missing?: boolean;
            revisions?: {
              revid?: number;
              timestamp?: string;
              slots?: { main?: { content?: string } };
            }[];
          }[];
        };
      }
    ).query?.pages?.[0];
    const revision = page?.revisions?.[0];
    if (at && page?.title && !page.missing && !revision) {
      throw new RulesPipelineError(
        "year_not_covered",
        `Page "${title}" has no revision before ${at.toISOString()}`,
        { title, at: at.toISOString() },
      );
    }
    const wikitext = revision?.slots?.main?.content;
    if (
      !page?.title ||
      typeof revision?.revid !== "number" ||
      typeof revision.timestamp !== "string" ||
      typeof wikitext !== "string"
    ) {
      throw new RulesPipelineError(
        "source_format_changed",
        `Page "${title}" is missing${at ? ` at ${at.toISOString()}` : ""}`,
        {
          title,
          at: at?.toISOString() ?? null,
          missing: page?.missing ?? null,
        },
      );
    }

    return {
      title: page.title,
      revisionId: revision.revid,
      timestamp: revision.timestamp,
      wikitext,
      ref: {
        url: `${this.site.indexUrl}?oldid=${revision.revid}`,
        title: page.title,
        revisionId: revision.revid,
        license: this.site.license,
        retrievedAt: this.now().toISOString(),
      },
    };
  }

  private async request(
    params: URLSearchParams,
    title: string,
  ): Promise<unknown> {
    try {
      const response = await this.fetch(`${this.site.apiUrl}?${params}`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new RulesPipelineError(
          "source_unavailable",
          `${this.site.apiUrl} answered HTTP ${response.status}`,
          { title, status: response.status },
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof RulesPipelineError) throw error;
      throw new RulesPipelineError(
        "source_unavailable",
        `${this.site.apiUrl} could not be reached`,
        { title, cause: String(error) },
      );
    }
  }
}

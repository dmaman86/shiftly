import { USER_AGENT } from "./http-document-fetcher.ts";

/** One archived capture of a page. */
export type ArchivedSnapshot = {
  /** Capture time as the archive writes it: YYYYMMDDhhmmss, UTC. */
  readonly timestamp: string;
  /** Capture day, YYYY-MM-DD. */
  readonly capturedOn: string;
  /** The capture exactly as archived, without the archive's banner. */
  readonly url: string;
};

/**
 * Where to find past versions of a page. An index only proposes URLs: the
 * capture itself is fetched, and its content decides, like any source.
 */
export interface ArchiveIndex {
  /** Successful captures with distinct content, oldest first. */
  snapshots(url: string): Promise<readonly ArchivedSnapshot[]>;
}

const CDX_URL = "https://web.archive.org/cdx/search/cdx";
const TIMEOUT_MS = 60_000;

/**
 * The Internet Archive's Wayback Machine. A capture of an official page is
 * tier 2 (see source-policy.ts): official content, served by a mirror.
 */
export class WaybackArchiveIndex implements ArchiveIndex {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetch?: typeof fetch } = {}) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  async snapshots(url: string): Promise<readonly ArchivedSnapshot[]> {
    const params = new URLSearchParams({
      url: decodeURI(url),
      output: "json",
      fl: "timestamp,statuscode",
      filter: "statuscode:200",
      collapse: "digest",
    });
    const response = await this.fetchImpl(`${CDX_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`the archive index answered HTTP ${response.status}`);
    }
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows))
      throw new Error("the archive index answered no list");
    return rows
      .slice(1)
      .map((row) => (Array.isArray(row) ? String(row[0]) : ""))
      .filter((timestamp) => /^\d{14}$/.test(timestamp))
      .sort()
      .map((timestamp) => ({
        timestamp,
        capturedOn: capturedOnOf(timestamp),
        url: waybackCaptureUrl(timestamp, url),
      }));
  }
}

/** The capture as archived ("id_"): the original bytes, no banner, no rewritten links. */
export const waybackCaptureUrl = (timestamp: string, url: string) =>
  `https://web.archive.org/web/${timestamp}id_/${url}`;

const capturedOnOf = (timestamp: string) =>
  `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;

/** The capture day of a Wayback URL (after redirects), or null for other URLs. */
export function waybackCaptureDay(url: string): string | null {
  const match = /^https:\/\/web\.archive\.org\/web\/(\d{14})[a-z_]*\//.exec(
    url,
  );
  return match ? capturedOnOf(match[1]) : null;
}

import type {
  PublishedElection,
  PublishedElectionsReader,
} from "./published-elections.ts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

type Entry = {
  readonly expiresAt: number;
  readonly elections: Promise<PublishedElection[]>;
};

/**
 * Per-year cache in front of the store, so public traffic reaches Supabase at
 * most once per year every five minutes. Concurrent misses share one read; a
 * failed read is not cached.
 */
export class CachedPublishedElectionsReader implements PublishedElectionsReader {
  private readonly entries = new Map<number, Entry>();
  private readonly inner: PublishedElectionsReader;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    inner: PublishedElectionsReader,
    options: { ttlMs?: number; now?: () => number } = {},
  ) {
    this.inner = inner;
    this.ttlMs = options.ttlMs ?? FIVE_MINUTES_MS;
    this.now = options.now ?? Date.now;
  }

  electionsIn(year: number): Promise<PublishedElection[]> {
    const cached = this.entries.get(year);
    if (cached && cached.expiresAt > this.now()) return cached.elections;

    const elections = this.inner.electionsIn(year);
    const entry = { expiresAt: this.now() + this.ttlMs, elections };
    this.entries.set(year, entry);
    elections.catch(() => {
      if (this.entries.get(year) === entry) this.entries.delete(year);
    });
    return elections;
  }
}

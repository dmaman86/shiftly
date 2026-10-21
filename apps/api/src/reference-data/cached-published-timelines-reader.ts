import type {
  PublishedTimelines,
  PublishedTimelinesReader,
} from "./published-timelines.ts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

type Entry = {
  readonly expiresAt: number;
  readonly timelines: Promise<PublishedTimelines>;
};

/**
 * Keeps the published timelines in memory, so public traffic reaches Supabase
 * at most once every five minutes. Concurrent misses share one read; a failed
 * or invalid read is not cached.
 */
export class CachedPublishedTimelinesReader implements PublishedTimelinesReader {
  private entry: Entry | null = null;
  private readonly inner: PublishedTimelinesReader;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    inner: PublishedTimelinesReader,
    options: { ttlMs?: number; now?: () => number } = {},
  ) {
    this.inner = inner;
    this.ttlMs = options.ttlMs ?? FIVE_MINUTES_MS;
    this.now = options.now ?? Date.now;
  }

  timelines(): Promise<PublishedTimelines> {
    if (this.entry && this.entry.expiresAt > this.now()) {
      return this.entry.timelines;
    }

    const timelines = this.inner.timelines();
    const entry = { expiresAt: this.now() + this.ttlMs, timelines };
    this.entry = entry;
    timelines.catch(() => {
      if (this.entry === entry) this.entry = null;
    });
    return timelines;
  }
}

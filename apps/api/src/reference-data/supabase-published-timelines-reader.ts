import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ReferenceDataPersistenceError } from "./ports.ts";
import {
  InvalidPublishedTimelineError,
  monthlyTimelineProblem,
  PUBLISHED_TIMELINE_KINDS,
  type PublishedTimelineKind,
  type PublishedTimelines,
  type PublishedTimelinesReader,
} from "./published-timelines.ts";

const rate = z.number().finite().nonnegative();

const VALUE_SCHEMAS = {
  "per_diem.point_rate": z.object({ amount: rate }),
  "meal_allowance.rates": z.object({ small: rate, large: rate }),
} satisfies Record<PublishedTimelineKind, z.ZodType>;

const rowSchema = z.object({
  kind: z.enum(PUBLISHED_TIMELINE_KINDS),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  value: z.unknown(),
});

/**
 * Reads with the backend secret key: the reference tables have RLS with no
 * policies and no browser grants. One query returns the period and value of
 * every active revision without a subject for the published kinds.
 */
export class SupabasePublishedTimelinesReader implements PublishedTimelinesReader {
  private readonly client: SupabaseClient;

  constructor(options: {
    url: string;
    secretKey: string;
    /** Test seam: the HTTP client. */
    fetch?: typeof fetch;
  }) {
    this.client = createClient(options.url, options.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
    });
  }

  async timelines(): Promise<PublishedTimelines> {
    const { data, error } = await this.client
      .from("reference_revisions")
      .select("kind, valid_from, valid_to, value")
      .in("kind", [...PUBLISHED_TIMELINE_KINDS])
      .eq("status", "active")
      .is("subject_key", null)
      .order("valid_from");
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading published timelines failed: ${error.message}`,
      );
    }
    return toPublishedTimelines(data);
  }
}

/**
 * Maps rows to the public DTO and validates each kind as a timeline. A
 * malformed value, an overlap or a value that does not start on the first of
 * a month fails the whole read: nothing is guessed or repaired.
 */
export function toPublishedTimelines(rows: unknown): PublishedTimelines {
  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success) {
    throw new InvalidPublishedTimelineError(
      "an active timeline revision has an unexpected shape",
    );
  }

  const byKind = Object.fromEntries(
    PUBLISHED_TIMELINE_KINDS.map((kind) => [
      kind,
      parsed.data
        .filter((row) => row.kind === kind)
        .map((row) => {
          const value = VALUE_SCHEMAS[kind].safeParse(row.value);
          if (!value.success) {
            throw new InvalidPublishedTimelineError(
              `${kind} from ${row.valid_from} has an unexpected value`,
            );
          }
          return {
            validFrom: row.valid_from,
            validTo: row.valid_to,
            value: value.data,
          };
        })
        .sort((a, b) => a.validFrom.localeCompare(b.validFrom)),
    ]),
  ) as unknown as PublishedTimelines;

  for (const kind of PUBLISHED_TIMELINE_KINDS) {
    const problem = monthlyTimelineProblem(byKind[kind]);
    if (problem !== null) {
      throw new InvalidPublishedTimelineError(`${kind} ${problem}`);
    }
  }
  return byKind;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ReferenceDataPersistenceError } from "./ports.ts";
import type {
  PublishedElection,
  PublishedElectionsReader,
} from "./published-elections.ts";

const electionRowSchema = z.object({
  valid_from: z.iso.date(),
  value: z.object({
    knessetNumber: z.number().int().positive(),
    electionStatus: z.enum(["planned", "confirmed", "occurred", "cancelled"]),
  }),
});

/**
 * Reads with the backend secret key: the reference tables have RLS with no
 * policies and no browser grants, and this endpoint does not change that.
 * Selects only the period and value of active revisions.
 */
export class SupabasePublishedElectionsReader implements PublishedElectionsReader {
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

  async electionsIn(year: number): Promise<PublishedElection[]> {
    const { data, error } = await this.client
      .from("reference_revisions")
      .select("valid_from, value")
      .eq("kind", "calendar.knesset_election")
      .eq("status", "active")
      .gte("valid_from", `${year}-01-01`)
      .lt("valid_from", `${year + 1}-01-01`)
      .order("valid_from");
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading published elections for ${year} failed: ${error.message}`,
      );
    }
    return toPublishedElections(data);
  }
}

/**
 * Maps rows straight to the public DTO. A malformed active revision fails the
 * whole read rather than publishing a guess.
 */
export function toPublishedElections(rows: unknown): PublishedElection[] {
  const parsed = z.array(electionRowSchema).safeParse(rows);
  if (!parsed.success) {
    throw new ReferenceDataPersistenceError(
      "an active election revision has an unexpected shape",
    );
  }
  return parsed.data.flatMap(({ valid_from, value }) =>
    value.electionStatus === "cancelled"
      ? []
      : [
          {
            knessetNumber: value.knessetNumber,
            date: valid_from,
            status: value.electionStatus,
          },
        ],
  );
}

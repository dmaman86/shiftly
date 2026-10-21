import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ReferenceDataPersistenceError,
  type ActiveRevision,
  type CurrentRevision,
  type NewCandidate,
  type ReferenceKind,
  type RevisionAdministration,
  type RevisionDetails,
  type RevisionRepository,
  type RevisionTrust,
} from "./ports.ts";

type RevisionRow = {
  id: string;
  kind: ReferenceKind;
  subject_key: string | null;
  valid_from: string;
  valid_to: string | null;
  value: unknown;
  trust: RevisionTrust;
};

type RevisionDetailsRow = RevisionRow & {
  status: RevisionDetails["status"];
  origin: RevisionDetails["origin"];
};

const toActiveRevision = (row: RevisionRow): ActiveRevision => ({
  id: row.id,
  kind: row.kind,
  subjectKey: row.subject_key,
  validFrom: row.valid_from,
  validTo: row.valid_to,
  value: row.value,
  trust: row.trust,
});

type CurrentRevisionRow = {
  id: string;
  subject_key: string | null;
  status: CurrentRevision["status"];
  valid_from: string;
  trust: RevisionTrust;
};

/**
 * Uses the backend secret key (service_role). The reference tables have RLS
 * with no policies, so this key is the only way in; it must never reach a
 * browser bundle.
 */
export class SupabaseRevisionRepository
  implements RevisionRepository, RevisionAdministration
{
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

  async insertCandidate(candidate: NewCandidate): Promise<string> {
    const { data, error } = await this.client.rpc(
      "insert_reference_candidate",
      {
        p_kind: candidate.kind,
        p_subject_key: candidate.subjectKey,
        p_valid_from: candidate.validFrom,
        p_valid_to: candidate.validTo,
        p_value: candidate.value,
        p_origin: candidate.origin,
        p_trust: candidate.trust,
        p_fallback_reason: candidate.fallbackReason,
        p_sources: candidate.sources,
        p_evidence: candidate.evidence,
      },
    );
    if (error) {
      throw new ReferenceDataPersistenceError(
        `insert_reference_candidate failed: ${error.message}`,
      );
    }
    if (typeof data !== "string") {
      throw new ReferenceDataPersistenceError(
        "insert_reference_candidate returned no revision id",
      );
    }
    return data;
  }

  async findActive(
    kind: ReferenceKind,
    on: string,
  ): Promise<ActiveRevision | null> {
    // `on` is interpolated into a PostgREST filter string below.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) {
      throw new ReferenceDataPersistenceError(`invalid date ${on}`);
    }
    const { data, error } = await this.client
      .from("reference_revisions")
      .select("id, kind, subject_key, valid_from, valid_to, value, trust")
      .eq("kind", kind)
      .eq("status", "active")
      .lte("valid_from", on)
      .or(`valid_to.is.null,valid_to.gt.${on}`)
      .maybeSingle<RevisionRow>();
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading the active ${kind} failed: ${error.message}`,
      );
    }
    return data ? toActiveRevision(data) : null;
  }

  async findStartingIn(
    kind: ReferenceKind,
    from: string,
    until: string,
  ): Promise<CurrentRevision[]> {
    const { data, error } = await this.client
      .from("reference_revisions")
      .select("id, subject_key, status, valid_from, trust")
      .eq("kind", kind)
      .in("status", ["active", "pending_review"])
      .gte("valid_from", from)
      .lt("valid_from", until)
      .order("valid_from")
      .returns<CurrentRevisionRow[]>();
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading current ${kind} revisions failed: ${error.message}`,
      );
    }
    return data.map((row) => ({
      id: row.id,
      subjectKey: row.subject_key,
      status: row.status,
      validFrom: row.valid_from,
      trust: row.trust,
    }));
  }

  async findActiveSubject(
    kind: ReferenceKind,
    subjectKey: string,
  ): Promise<ActiveRevision | null> {
    const { data, error } = await this.client
      .from("reference_revisions")
      .select("id, kind, subject_key, valid_from, valid_to, value, trust")
      .eq("kind", kind)
      .eq("subject_key", subjectKey)
      .eq("status", "active")
      .maybeSingle<RevisionRow>();
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading the active ${subjectKey} failed: ${error.message}`,
      );
    }
    return data ? toActiveRevision(data) : null;
  }

  async findRevision(id: string): Promise<RevisionDetails | null> {
    const { data, error } = await this.client
      .from("reference_revisions")
      .select(
        "id, kind, subject_key, status, valid_from, valid_to, value, origin, trust",
      )
      .eq("id", id)
      .maybeSingle<RevisionDetailsRow>();
    if (error) {
      throw new ReferenceDataPersistenceError(
        `reading revision ${id} failed: ${error.message}`,
      );
    }
    return data
      ? {
          ...toActiveRevision(data),
          status: data.status,
          origin: data.origin,
        }
      : null;
  }

  async activate(id: string, reviewer: string): Promise<void> {
    const { error } = await this.client.rpc("activate_reference_revision", {
      p_revision_id: id,
      p_reviewer: reviewer,
    });
    if (error) {
      throw new ReferenceDataPersistenceError(
        `activate_reference_revision failed: ${error.message}`,
      );
    }
  }
}

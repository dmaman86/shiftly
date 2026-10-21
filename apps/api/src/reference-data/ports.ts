/**
 * Persistence of versioned reference data. Application code depends on these
 * types only; the Supabase implementation is the one place that knows tables
 * and RPC names (supabase/migrations/20261020*_reference_data_*.sql).
 */

export type ReferenceKind =
  | "income_tax.monthly_brackets"
  | "income_tax.credit_point"
  | "per_diem.point_rate"
  | "meal_allowance.rates"
  | "calendar.knesset_election";

export type RevisionTrust =
  | "official_verified"
  | "official_grounded"
  | "secondary_verified"
  | "secondary_grounded"
  | "carried_forward"
  | "legacy_seed"
  | "manual";

export type RevisionFallbackReason =
  | "official_source_blocked"
  | "official_source_not_found"
  | "official_source_insufficient";

/** One source the research looked at, fetched or not. */
export type CandidateSource = {
  readonly url: string;
  readonly finalUrl: string | null;
  readonly publisher: string;
  readonly tier: 1 | 2 | 3 | 4;
  readonly discoveredVia:
    "known_source" | "grounding_metadata" | "response_text" | "manual";
  readonly accessStatus:
    | "not_fetched"
    | "fetched"
    | "blocked"
    | "not_found"
    | "unavailable"
    | "unsupported_content";
  readonly httpStatus: number | null;
  readonly contentType: string | null;
  readonly title: string | null;
  /** Present exactly when accessStatus is "fetched". */
  readonly sha256: string | null;
  readonly grounding: Readonly<Record<string, unknown>> | null;
  /** null exactly when accessStatus is "not_fetched". */
  readonly fetchAttemptedAt: string | null;
  readonly role: "supporting" | "consulted";
};

export type CandidateEvidence = {
  readonly evidenceType:
    | "fetched_verified"
    | "grounded"
    | "trusted_secondary_grounded"
    | "carried_forward"
    | "manual";
  /** Index into the candidate's sources; null for carried-forward or manual evidence. */
  readonly source: number | null;
  readonly carriedFromRevisionId: string | null;
  readonly quote: string | null;
  readonly section: string | null;
  readonly sourceReference: string | null;
  readonly page: number | null;
  readonly effectiveFrom: string | null;
  readonly grounding: Readonly<Record<string, unknown>> | null;
  readonly note: string | null;
};

/** A validated value for one kind and period, stored as pending review. */
export type NewCandidate = {
  readonly kind: ReferenceKind;
  /**
   * The stable entity inside the kind (e.g. "knesset:26"), independent of its
   * period; null for kinds whose periods hold a single value (income tax).
   * A revision with a subject replaces the active one of the same subject.
   */
  readonly subjectKey: string | null;
  /** First day it applies, YYYY-MM-DD. */
  readonly validFrom: string;
  /** First day it no longer applies; null means until further notice. */
  readonly validTo: string | null;
  readonly value: unknown;
  readonly origin: "research" | "seed" | "manual";
  readonly trust: RevisionTrust;
  readonly fallbackReason: RevisionFallbackReason | null;
  readonly sources: readonly CandidateSource[];
  readonly evidence: readonly CandidateEvidence[];
};

export type ActiveRevision = {
  readonly id: string;
  readonly kind: ReferenceKind;
  readonly subjectKey: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly value: unknown;
  readonly trust: RevisionTrust;
};

/** A revision that is live or awaiting review. */
export type CurrentRevision = {
  readonly id: string;
  readonly subjectKey: string | null;
  readonly status: "active" | "pending_review";
  readonly validFrom: string;
  readonly trust: RevisionTrust;
};

export interface RevisionRepository {
  /**
   * Stores the candidate with its sources and evidence in one transaction and
   * returns its id. Never activates it. The same value for the same period
   * returns the existing revision when its trust already covers the
   * candidate's; stronger or incomparable provenance becomes a new pending
   * revision (see reference_trust_covers in the migrations).
   */
  insertCandidate(candidate: NewCandidate): Promise<string>;
  /** The active revision of a kind on a date (YYYY-MM-DD), if any. */
  findActive(kind: ReferenceKind, on: string): Promise<ActiveRevision | null>;
  /**
   * Active and pending revisions of a kind that start in [from, until),
   * both YYYY-MM-DD. Rejected and superseded revisions are left out.
   */
  findStartingIn(
    kind: ReferenceKind,
    from: string,
    until: string,
  ): Promise<CurrentRevision[]>;
}

/** A stored revision as an administrator reviews it. */
export type RevisionDetails = {
  readonly id: string;
  readonly kind: ReferenceKind;
  readonly subjectKey: string | null;
  readonly status: "pending_review" | "active" | "superseded" | "rejected";
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly value: unknown;
  readonly origin: NewCandidate["origin"];
  readonly trust: RevisionTrust;
};

/**
 * Review operations for administrator commands. Kept apart from
 * RevisionRepository: research stores candidates, only a person activates them.
 */
export interface RevisionAdministration {
  /** The active revision of one subject (e.g. "knesset:26"), whatever its period. */
  findActiveSubject(
    kind: ReferenceKind,
    subjectKey: string,
  ): Promise<ActiveRevision | null>;
  findRevision(id: string): Promise<RevisionDetails | null>;
  /**
   * Makes a pending revision active and supersedes what it replaces, in one
   * transaction (activate_reference_revision). The reviewer is recorded.
   */
  activate(id: string, reviewer: string): Promise<void>;
}

/** The store rejected or could not complete a request. */
export class ReferenceDataPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceDataPersistenceError";
  }
}

/**
 * The public, read-only view of Knesset election days. Only active revisions
 * are published, already mapped to this DTO: ids, subject keys, trust,
 * sources, evidence and review state never leave the reader.
 */

/** A cancelled election pays no premium, so it is never published. */
export type PublishedElectionStatus = "planned" | "confirmed" | "occurred";

export type PublishedElection = {
  readonly knessetNumber: number;
  /** The election day, YYYY-MM-DD. */
  readonly date: string;
  readonly status: PublishedElectionStatus;
};

export interface PublishedElectionsReader {
  /** Published elections whose day falls in the year, ordered by date. */
  electionsIn(year: number): Promise<PublishedElection[]>;
}

/**
 * First year the application calculates. Mirrors SYSTEM_START_YEAR in
 * @shiftly/domain, which the API cannot import at runtime; a test keeps them
 * equal.
 */
export const FIRST_SUPPORTED_YEAR = 2015;

/**
 * Years the web app can ask for: it offers months up to the current one, and
 * a December range ends on January 1 of the next year.
 */
export function supportedYears(now: Date): {
  readonly first: number;
  readonly last: number;
} {
  return { first: FIRST_SUPPORTED_YEAR, last: now.getUTCFullYear() + 1 };
}

import axios from "axios";

/** How apps/api publishes an election day (GET /reference/elections). */
export interface PublishedElection {
  knessetNumber: number;
  /** YYYY-MM-DD */
  date: string;
  status: "planned" | "confirmed" | "occurred";
}

/**
 * "api": the API answered and its answer is authoritative, even when empty.
 * "unavailable": the API could not be used (not configured, network failure,
 * timeout or 5xx), so callers keep their legacy source.
 */
export type ElectionsResult =
  | { source: "api"; elections: PublishedElection[] }
  | { source: "unavailable"; reason: string };

const REQUEST_TIMEOUT_MS = 5000;
const STATUSES: ReadonlySet<string> = new Set([
  "planned",
  "confirmed",
  "occurred",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPublishedElection = (value: unknown): value is PublishedElection =>
  isRecord(value) &&
  Number.isInteger(value.knessetNumber) &&
  (value.knessetNumber as number) > 0 &&
  typeof value.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
  typeof value.status === "string" &&
  STATUSES.has(value.status);

/** A 200 that breaks the contract is a bug to surface, not an outage. */
const parseElections = (
  payload: unknown,
  year: number,
): PublishedElection[] => {
  if (
    !isRecord(payload) ||
    payload.year !== year ||
    !Array.isArray(payload.elections) ||
    !payload.elections.every(isPublishedElection)
  ) {
    throw new Error(`Invalid elections response for ${year}`);
  }
  return payload.elections;
};

// Read on every call, so the base URL is resolved from the build and tests
// can stub it.
const apiBaseUrl = (): string | undefined =>
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || undefined;

export const referenceService = () => {
  const getElections = async (year: number): Promise<ElectionsResult> => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return { source: "unavailable", reason: "not_configured" };

    let payload: unknown;
    try {
      const response = await axios.get<unknown>(
        `${baseUrl}/reference/elections`,
        { params: { year }, timeout: REQUEST_TIMEOUT_MS },
      );
      payload = response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === undefined) {
          return {
            source: "unavailable",
            reason: error.code === "ECONNABORTED" ? "timeout" : "network",
          };
        }
        if (status >= 500) {
          return { source: "unavailable", reason: `http_${status}` };
        }
      }
      // An ordinary 4xx means this client sent something wrong: surface it.
      throw error;
    }
    return { source: "api", elections: parseElections(payload, year) };
  };

  return { getElections };
};

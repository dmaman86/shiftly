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

/** How apps/api publishes a rate timeline entry (GET /reference/timelines). */
export interface PublishedTimelineEntry<V> {
  /** YYYY-MM-DD, inclusive. */
  validFrom: string;
  /** YYYY-MM-DD, exclusive; null until further notice. */
  validTo: string | null;
  value: V;
}

export interface PublishedTimelines {
  "per_diem.point_rate": PublishedTimelineEntry<{ amount: number }>[];
  "meal_allowance.rates": PublishedTimelineEntry<{
    small: number;
    large: number;
  }>[];
}

export const TIMELINE_KINDS = [
  "per_diem.point_rate",
  "meal_allowance.rates",
] as const;

/**
 * "api": the API answered with a valid payload; authoritative even when it
 * differs from the embedded baseline. "unavailable": the API could not be
 * used (not configured, network, timeout, 5xx) or answered a 200 that breaks
 * the contract ("invalid_response").
 */
export type TimelinesResult =
  | { source: "api"; timelines: PublishedTimelines }
  | { source: "unavailable"; reason: string };

const isRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isEntry = (
  value: unknown,
  isValue: (value: unknown) => boolean,
): boolean =>
  isRecord(value) &&
  isDate(value.validFrom) &&
  (value.validTo === null || isDate(value.validTo)) &&
  isValue(value.value);

const VALUE_CHECKS: Record<
  (typeof TIMELINE_KINDS)[number],
  (value: unknown) => boolean
> = {
  "per_diem.point_rate": (value) => isRecord(value) && isRate(value.amount),
  "meal_allowance.rates": (value) =>
    isRecord(value) && isRate(value.small) && isRate(value.large),
};

/** The shape of the timelines; whether they form valid timelines is the domain's call. */
export const isPublishedTimelines = (
  value: unknown,
): value is PublishedTimelines =>
  isRecord(value) &&
  TIMELINE_KINDS.every((kind) => {
    const entries = value[kind];
    return (
      Array.isArray(entries) &&
      entries.every((entry) => isEntry(entry, VALUE_CHECKS[kind]))
    );
  });

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

  const getTimelines = async (): Promise<TimelinesResult> => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return { source: "unavailable", reason: "not_configured" };

    let payload: unknown;
    try {
      const response = await axios.get<unknown>(
        `${baseUrl}/reference/timelines`,
        {
          params: { kinds: TIMELINE_KINDS.join(",") },
          timeout: REQUEST_TIMEOUT_MS,
        },
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
    // Rates gate every calculation, so a broken payload falls back visibly
    // instead of taking the whole app down.
    return isRecord(payload) && isPublishedTimelines(payload.timelines)
      ? { source: "api", timelines: payload.timelines }
      : { source: "unavailable", reason: "invalid_response" };
  };

  return { getElections, getTimelines };
};

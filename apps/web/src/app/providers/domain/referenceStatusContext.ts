import { createContext } from "react";
import type { ReferenceSource } from "@/services/reference/referenceTimelines";

/**
 * Where the rates in use came from, for notices. Separate from the domain
 * context: the domain only calculates, this describes availability. Null
 * when the domain is overridden (tests), so no notice is shown.
 */
export interface ReferenceStatus {
  source: ReferenceSource;
  /** False until the API request has finished; notices wait for it. */
  settled: boolean;
  /** A client error (4xx) loading the rates; the app keeps calculating with the fallback. */
  error: Error | null;
  retry: () => void;
  retrying: boolean;
}

export const ReferenceStatusContext = createContext<ReferenceStatus | null>(
  null,
);

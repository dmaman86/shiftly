import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services";
import {
  fallbackReferences,
  loadReferenceTimelines,
  type LoadedReferences,
} from "@/services/reference/referenceTimelines";
import type { ReferenceStatus } from "./referenceStatusContext";

const trackSource = ({ source }: LoadedReferences) => {
  if (source.status === "fresh" || source.reason === "not_configured") return;
  analyticsService.track({
    name: "exception",
    params: {
      description: source.reason,
      fatal: false,
      error_type: `reference_timelines_${source.status}`,
    },
  });
};

/**
 * The rates to calculate with. Starts synchronously from the last valid
 * answer or the embedded baseline, so the first render never waits for the
 * API, then switches to the API's answer once it arrives.
 */
export const useReferenceTimelines = (): {
  references: LoadedReferences;
  status: ReferenceStatus;
} => {
  const [initial] = useState(() => fallbackReferences("pending"));
  const query = useQuery({
    queryKey: ["referenceTimelines"],
    queryFn: () => loadReferenceTimelines(),
    placeholderData: initial,
    // A fresh answer holds for the session; a fallback is asked again on the
    // next mount or retry.
    staleTime: (q) => (q.state.data?.source.status === "fresh" ? Infinity : 0),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const settled = !query.isPlaceholderData && !query.isFetching;
  const references = query.isPlaceholderData
    ? initial
    : (query.data ?? initial);

  useEffect(() => {
    if (query.data && !query.isPlaceholderData) trackSource(query.data);
  }, [query.data, query.isPlaceholderData]);

  return {
    references,
    status: {
      source: references.source,
      settled,
      error: query.error,
      retry: () => void query.refetch(),
      retrying: query.isFetching,
    },
  };
};

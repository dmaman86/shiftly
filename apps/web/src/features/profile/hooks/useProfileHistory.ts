import { useEffect } from "react";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useDomain } from "@/hooks";
import { loadCalendarEventMap } from "@/hooks/useWorkDays";
import { loadProfileHistory } from "../services/profileHistory.service";
import type { ProfileRange } from "../helpers/profileRange";
import { useGuestDraftImportGate } from "@/features/guest-draft/guestDraftImportContext";

export const useProfileHistory = (range: ProfileRange) => {
  const { user, isLoading, initializationError } = useAuth();
  const domain = useDomain();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const pendingWrites = useIsMutating();
  const { ready: guestDraftReady } = useGuestDraftImportGate();
  const waitingForWrites = pendingWrites > 0 || !guestDraftReady;

  useEffect(() => {
    // Unmount cleanup can start a debounced editor write after this query began.
    // Discard that in-flight read; enabling again must start a fresh snapshot.
    if (waitingForWrites) {
      void queryClient.cancelQueries({
        queryKey: [
          "profileHistory",
          userId,
          range.from.year,
          range.from.month,
          range.to.year,
          range.to.month,
        ],
        exact: true,
      });
    }
  }, [
    range.from.month,
    range.from.year,
    range.to.month,
    range.to.year,
    queryClient,
    userId,
    waitingForWrites,
  ]);

  const query = useQuery({
    queryKey: [
      "profileHistory",
      userId,
      range.from.year,
      range.from.month,
      range.to.year,
      range.to.month,
    ],
    enabled:
      !!userId && !isLoading && !initializationError && !waitingForWrites,
    // Editor writes are independent: reread persisted data on every visit.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("An authenticated user is required");
      return loadProfileHistory(
        userId,
        range,
        domain,
        (period) =>
          queryClient.query({
            queryKey: ["workDays", period.year, period.month],
            staleTime: Infinity,
            queryFn: async () => {
              const range = domain.services.dateService.getDatesRange(
                period.year,
                period.month,
              );
              const eventMap = await loadCalendarEventMap(
                range.startDate,
                range.endDate,
              );
              return domain.payMap.workDaysMonthBuilder.build({
                ...period,
                eventMap,
              });
            },
          }),
        signal,
      );
    },
  });

  return { ...query, waitingForWrites };
};

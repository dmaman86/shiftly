import { useEffect } from "react";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useDomain } from "@/hooks";
import {
  combineElectionData,
  loadMonthCalendar,
  monthCalendarQueryKey,
  type ElectionDataState,
  type MonthCalendar,
} from "@/hooks/useWorkDays";
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
      const electionStates: ElectionDataState[] = [];
      const snapshots = await loadProfileHistory(
        userId,
        range,
        domain,
        async (period) => {
          const calendar = await queryClient.query<MonthCalendar>({
            queryKey: monthCalendarQueryKey(period.year, period.month),
            queryFn: () => loadMonthCalendar(domain, period.year, period.month),
            staleTime: (current) =>
              current.state.data?.electionData.status === "fresh"
                ? Infinity
                : 0,
          });
          electionStates.push(calendar.electionData);
          return calendar.workDays;
        },
        signal,
      );
      return { snapshots, electionData: combineElectionData(electionStates) };
    },
  });

  return {
    ...query,
    data: query.data?.snapshots,
    electionData: query.data?.electionData,
    waitingForWrites,
  };
};

import { useCallback, useEffect, useRef } from "react";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAppSnackbar, useAuth, useDomain, useGlobalState } from "@/hooks";
import { monthlyConfigService } from "@/services";
import { resolveErrorMessage } from "@/utils";

type BalanceWrite = {
  userId: string;
  year: number;
  month: number;
  hours: number;
};

const balanceKey = (userId: string | undefined, year: number, month: number) =>
  ["shabbatCreditBalance", userId, year, month] as const;
const carryOverKey = (
  userId: string | undefined,
  year: number,
  month: number,
) => ["shabbatCreditCarryOver", userId, year, month] as const;

const isBalanceWrite = (value: unknown): value is BalanceWrite =>
  typeof value === "object" &&
  value !== null &&
  "userId" in value &&
  typeof value.userId === "string" &&
  "year" in value &&
  typeof value.year === "number" &&
  "month" in value &&
  typeof value.month === "number" &&
  "hours" in value &&
  typeof value.hours === "number" &&
  Number.isFinite(value.hours) &&
  value.hours >= 0;

export const useShabbatCreditCarryOver = () => {
  const { user } = useAuth();
  const { year, month } = useGlobalState();
  const { services } = useDomain();
  const snackbar = useAppSnackbar();
  const previous = services.dateService.getPreviousMonth(year, month);
  const submittedRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const previousBalanceKey = balanceKey(
    user?.id,
    previous.year,
    previous.month,
  );
  // Filter synchronously: a changed subscription can briefly expose the old period.
  useMutationState();
  const previousMutations = queryClient
    .getMutationCache()
    .findAll({ mutationKey: previousBalanceKey, exact: true });
  const previousState = previousMutations[previousMutations.length - 1]?.state;
  const previousWriteError =
    previousState?.status === "error" ? previousState.error : null;
  const previousWrites =
    queryClient.isMutating({
      mutationKey: previousBalanceKey,
    }) +
    queryClient.isMutating({
      mutationKey: ["monthlyConfig", user?.id, previous.year, previous.month],
    });
  const query = useQuery({
    queryKey: carryOverKey(user?.id, year, month),
    enabled: !!user && previousWrites === 0 && !previousWriteError,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) throw new Error("An authenticated user is required");
      const result = await monthlyConfigService()
        .fetch(user.id, previous.year, previous.month)
        .call();
      if (result.error !== undefined) throw new Error(result.error);
      const hours = result.data?.unused_shabbat_credit_hours ?? 0;
      if (!Number.isFinite(hours) || hours < 0)
        throw new RangeError("The saved Shabbat credit balance is invalid");
      return hours;
    },
  });
  useEffect(() => {
    if (query.error) snackbar.error(resolveErrorMessage(query.error));
  }, [query.error, snackbar]);
  const mutation = useMutation({
    mutationKey: previousWriteError
      ? previousBalanceKey
      : balanceKey(user?.id, year, month),
    // Share the config-write scope so accepted writes cannot race rate edits.
    scope: { id: JSON.stringify(["monthlyConfig", user?.id]) },
    retry: false,
    mutationFn: async (write: BalanceWrite) => {
      const result = await monthlyConfigService()
        .setUnusedShabbatCreditHours(
          write.userId,
          write.year,
          write.month,
          write.hours,
        )
        .call();
      if (result.error !== undefined) throw new Error(result.error);
    },
    onError: (error, write) => {
      if (submittedRef.current === JSON.stringify(write))
        submittedRef.current = null;
      snackbar.error(resolveErrorMessage(error));
    },
    onSuccess: (_data, write) => {
      const nextYear = write.month === 12 ? write.year + 1 : write.year;
      const nextMonth = write.month === 12 ? 1 : write.month + 1;
      void queryClient.invalidateQueries({
        queryKey: carryOverKey(write.userId, nextYear, nextMonth),
      });
    },
  });
  const mutate = mutation.mutate;
  const ready =
    !!user &&
    query.isSuccess &&
    !query.isFetching &&
    previousWrites === 0 &&
    !previousWriteError;
  const persistUnusedHours = useCallback(
    (hours: number) => {
      if (!user || !ready || !Number.isFinite(hours) || hours < 0) return;
      const write = { userId: user.id, year, month, hours };
      const key = JSON.stringify(write);
      if (submittedRef.current === key) return;
      submittedRef.current = key;
      mutate(write);
    },
    [user, ready, year, month, mutate],
  );
  const currentWrite =
    mutation.variables?.userId === user?.id &&
    mutation.variables?.year === year &&
    mutation.variables?.month === month;
  return {
    carriedOverHours: query.data ?? 0,
    ready,
    persistUnusedHours,
    error:
      previousWriteError ??
      query.error ??
      (currentWrite ? mutation.error : null),
    retry: (hours?: number) => {
      if (
        previousWriteError &&
        isBalanceWrite(previousState?.variables) &&
        previousState.variables.userId === user?.id
      )
        mutate(previousState.variables);
      else if (query.isError) void query.refetch();
      else if (ready && currentWrite && mutation.isError && mutation.variables)
        mutate({
          ...mutation.variables,
          hours: hours ?? mutation.variables.hours,
        });
    },
  };
};

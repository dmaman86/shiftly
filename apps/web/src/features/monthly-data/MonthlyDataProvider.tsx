import { useCallback, useEffect, useMemo } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useAuth, useGlobalState } from "@/hooks";
import { monthlyConfigService } from "@/services";
import {
  defaultMonthlyConfig,
  useGlobalStore,
  type MonthlyConfigValues,
} from "@/store/globalStore";
import { resolveErrorMessage } from "@/utils";
import { useGuestDraftImportGate } from "@/features/guest-draft/guestDraftImportContext";
import { MonthlyConfigActionsContext } from "./monthlyConfigActionsContext";
import { MonthlyConfigStatusContext } from "./monthlyConfigStatusContext";

type MonthlyDataProviderProps = { children: React.ReactNode };
type ConfigChange = MonthlyConfigValues & {
  userId: string;
  year: number;
  month: number;
};

const configKey = (userId: string | undefined, year: number, month: number) =>
  ["monthlyConfig", userId, year, month] as const;

const LoadingConfig = () => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{ display: "flex", justifyContent: "center", p: 4 }}
      aria-busy="true"
    >
      <CircularProgress aria-label={t("config.loading")} />
    </Box>
  );
};

type MonthlyConfigSessionProps = MonthlyDataProviderProps & {
  userId: string | undefined;
  year: number;
  month: number;
  save: (change: ConfigChange) => void;
};

/** Publish readiness without replacing the application shell. */
const MonthlyConfigSession = ({
  userId,
  year,
  month,
  save,
  children,
}: MonthlyConfigSessionProps) => {
  const { t } = useTranslation();
  const { ready: guestDraftReady, restoreDraft } = useGuestDraftImportGate();
  const contextKey = JSON.stringify(configKey(userId, year, month));
  const initialized = useGlobalStore(
    (state) => state.monthlyConfigContextKey === contextKey,
  );
  const initializeMonth = useGlobalStore((state) => state.initializeMonth);
  // Subscribe globally, but read the current identity synchronously: changing
  // a filtered subscription can otherwise expose its previous period's count.
  useIsMutating();
  const queryClient = useQueryClient();
  const pendingSaves = queryClient.isMutating({
    mutationKey: configKey(userId, year, month),
  });
  const query = useQuery({
    queryKey: configKey(userId, year, month),
    enabled: !!userId && guestDraftReady && !initialized && pendingSaves === 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!userId) throw new Error("An authenticated user is required");
      const result = await monthlyConfigService()
        .fetch(userId, year, month)
        .call();
      if (result.error !== undefined) throw new Error(result.error);
      return result.data;
    },
  });

  useEffect(() => {
    if (
      initialized ||
      useGlobalStore.getState().monthlyConfigContextKey === contextKey ||
      (userId &&
        (!guestDraftReady ||
          pendingSaves > 0 ||
          !query.isSuccess ||
          query.isFetching))
    )
      return;
    // A guest whose sign-in did not complete gets back the rates of the month
    // they were filling in, alongside its shifts.
    const guestValues =
      restoreDraft?.year === year && restoreDraft.month === month
        ? restoreDraft.config
        : defaultMonthlyConfig;
    const values =
      userId && query.data
        ? {
            standardHours: query.data.standard_hours,
            baseRate: query.data.base_rate,
          }
        : guestValues;
    initializeMonth(year, month, values, contextKey);
  }, [
    contextKey,
    guestDraftReady,
    initialized,
    initializeMonth,
    month,
    pendingSaves,
    query.data,
    query.isFetching,
    query.isSuccess,
    restoreDraft,
    userId,
    year,
  ]);

  const edit = useCallback(
    (field: keyof MonthlyConfigValues, value: number) => {
      if (!initialized || !Number.isFinite(value) || value < 0) return;
      const store = useGlobalStore.getState();
      if (
        store.monthlyConfigContextKey !== contextKey ||
        store.config.year !== year ||
        store.config.month !== month ||
        store.config[field] === value
      )
        return;
      if (field === "baseRate") store.updateBaseRate(value);
      else store.updateStandardHours(value);
      const { baseRate, standardHours } = useGlobalStore.getState().config;
      if (userId) save({ userId, year, month, baseRate, standardHours });
    },
    [contextKey, initialized, month, save, userId, year],
  );
  const actions = useMemo(
    () => ({
      updateBaseRate: (value: number) => edit("baseRate", value),
      updateStandardHours: (value: number) => edit("standardHours", value),
    }),
    [edit],
  );

  const fallback = query.isError ? (
    <Alert
      severity="error"
      action={
        <Button onClick={() => void query.refetch()}>
          {t("actions.try_again")}
        </Button>
      }
    >
      {t("config.load_error")}
    </Alert>
  ) : (
    <LoadingConfig />
  );

  return (
    <MonthlyConfigActionsContext.Provider value={actions}>
      <MonthlyConfigStatusContext.Provider
        value={{ ready: initialized, contextKey, fallback }}
      >
        {children}
      </MonthlyConfigStatusContext.Provider>
    </MonthlyConfigActionsContext.Provider>
  );
};

/** Loading initializes state; only explicit editor commits schedule saves. */
export const MonthlyDataProvider = ({ children }: MonthlyDataProviderProps) => {
  const { user, isLoading: isAuthLoading, initializationError } = useAuth();
  const { year, month } = useGlobalState();
  const userId = user?.id;
  const snackbar = useAppSnackbar();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  // This owner survives month/route changes, so accepted writes retain their identity.
  const mutation = useMutation({
    mutationKey: configKey(userId, year, month),
    scope: { id: JSON.stringify(["monthlyConfig", userId]) },
    retry: false,
    mutationFn: async (change: ConfigChange) => {
      const result = await monthlyConfigService()
        .upsert(change.userId, {
          year: change.year,
          month: change.month,
          standard_hours: change.standardHours,
          base_rate: change.baseRate,
        })
        .call();
      if (result.error !== undefined) throw new Error(result.error);
    },
    onSuccess: (_data, change) => {
      void queryClient.invalidateQueries({
        queryKey: configKey(change.userId, change.year, change.month),
        refetchType: "none",
      });
    },
    onError: (error) => snackbar.error(resolveErrorMessage(error)),
  });

  if (isAuthLoading) return <LoadingConfig />;
  if (initializationError) {
    return <Alert severity="error">{t("auth.initialization_error")}</Alert>;
  }

  return (
    <>
      {mutation.isError && mutation.variables.userId === userId && (
        <Alert
          severity="error"
          action={
            <Button onClick={() => mutation.mutate(mutation.variables)}>
              {t("actions.try_again")}
            </Button>
          }
        >
          {t("config.save_error", {
            year: mutation.variables.year,
            month: mutation.variables.month,
          })}
        </Alert>
      )}
      <MonthlyConfigSession
        userId={userId}
        year={year}
        month={month}
        save={mutation.mutate}
      >
        {children}
      </MonthlyConfigSession>
    </>
  );
};

import { useEffect, useState } from "react";

import {
  useAppSnackbar,
  useAuth,
  useFetch,
  useGlobalState,
} from "@/hooks";
import { monthlyConfigService } from "@/services";
import { defaultMonthlyConfig } from "@/store/globalStore";
import { useGuestDraftImportGate } from "@/features/guest-draft/guestDraftImportContext";
import {
  MonthlyConfigHydrationContext,
  getMonthlyContextKey,
  type MonthlyConfigValues,
} from "./monthlyConfigHydrationContext";


type MonthlyDataProviderProps = {
  children: React.ReactNode;
};

/** Owns initialization of the selected monthly context above the pages. */
export const MonthlyDataProvider = ({ children }: MonthlyDataProviderProps) => {
  const { user } = useAuth();
  const {
    year,
    month,
    initializeMonth,
    updateStandardHours,
    updateBaseRate,
  } = useGlobalState();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();
  const [hydratedValues, setHydratedValues] =
    useState<MonthlyConfigValues | null>(null);
  const [hydratedContextKey, setHydratedContextKey] = useState<string | null>(null);
  const contextKey = getMonthlyContextKey(user?.id, year, month);
  const configReady =
    hydratedContextKey === contextKey && hydratedValues !== null;
  const { ready: guestDraftReady } = useGuestDraftImportGate();
  // Only gates signed-in hydration; a guest never loads anything, so their
  // config is not reset when the gate opens.
  const canHydrate = !!user && guestDraftReady;

  useEffect(() => {
    initializeMonth(year, month);

    if (!user || !canHydrate) return;

    let cancelled = false;
    const key = getMonthlyContextKey(user.id, year, month);

    void callEndPoint(monthlyConfigService().fetch(user.id, year, month)).then(
      (result) => {
        if (cancelled) return;

        if (result.error) {
          snackbar.error(result.error);
          return;
        }

        const values = result.data
          ? {
              standardHours: result.data.standard_hours,
              baseRate: result.data.base_rate,
            }
          : defaultMonthlyConfig;

        if (result.data) {
          updateStandardHours(values.standardHours);
          updateBaseRate(values.baseRate);
        }

        setHydratedValues(values);
        setHydratedContextKey(key);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    callEndPoint,
    canHydrate,
    initializeMonth,
    month,
    snackbar,
    updateBaseRate,
    updateStandardHours,
    user,
    year,
  ]);

  return (
    <MonthlyConfigHydrationContext.Provider
      value={{ configReady, contextKey, hydratedValues }}
    >
      {children}
    </MonthlyConfigHydrationContext.Provider>
  );
};

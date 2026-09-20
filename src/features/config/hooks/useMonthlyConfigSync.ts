import { useEffect, useRef } from "react";

import {
  useAppSnackbar,
  useAuth,
  useDebounce,
  useFetch,
  useGlobalState,
} from "@/hooks";
import { monthlyConfigService } from "@/services";

type HydrationState = {
  key: string;
  standardHours: number;
  baseRate: number;
  settled: boolean;
};

export const useMonthlyConfigSync = () => {
  const { user } = useAuth();
  const {
    year,
    month,
    standardHours,
    baseRate,
    updateStandardHours,
    updateBaseRate,
  } = useGlobalState();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();

  // The write-through effect has its own debounce. Keep the values returned by
  // hydration so that the first write cannot use the previous debounce value.
  const hydrationRef = useRef<HydrationState | null>(null);
  const latestConfigRef = useRef({ standardHours, baseRate });

  useEffect(() => {
    latestConfigRef.current = { standardHours, baseRate };
  }, [standardHours, baseRate]);

  useEffect(() => {
    if (!user) {
      hydrationRef.current = null;
      return;
    }

    const key = `${user.id}:${year}:${month}`;
    if (hydrationRef.current?.key === key) return;

    let cancelled = false;

    void callEndPoint(monthlyConfigService().fetch(user.id, year, month)).then(
      (result) => {
        if (cancelled) return;

        if (result.error) {
          hydrationRef.current = null;
          snackbar.error(result.error);
          return;
        }

        if (result.data) {
          hydrationRef.current = {
            key,
            standardHours: result.data.standard_hours,
            baseRate: result.data.base_rate,
            settled: false,
          };
          updateStandardHours(result.data.standard_hours);
          updateBaseRate(result.data.base_rate);
        } else {
          hydrationRef.current = {
            key,
            standardHours: latestConfigRef.current.standardHours,
            baseRate: latestConfigRef.current.baseRate,
            settled: false,
          };
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    user,
    year,
    month,
    callEndPoint,
    updateStandardHours,
    updateBaseRate,
    snackbar,
  ]);

  const debouncedStandardHours = useDebounce({ value: standardHours });
  const debouncedBaseRate = useDebounce({ value: baseRate });

  useEffect(() => {
    if (!user) return;
    const hydration = hydrationRef.current;
    if (!hydration || hydration.key !== `${user.id}:${year}:${month}`) return;

    const debounceMatchesCurrentValues =
      debouncedStandardHours === standardHours && debouncedBaseRate === baseRate;

    if (!hydration.settled) {
      if (!debounceMatchesCurrentValues) return;
      hydration.settled = true;

      const currentValuesAreHydrated =
        standardHours === hydration.standardHours && baseRate === hydration.baseRate;
      if (currentValuesAreHydrated) return;
    }

    void callEndPoint(
      monthlyConfigService().upsert(user.id, {
        year,
        month,
        standard_hours: debouncedStandardHours,
        base_rate: debouncedBaseRate,
      }),
    ).then((result) => {
      if (result.error) snackbar.error(result.error);
    });
  }, [
    user,
    year,
    month,
    standardHours,
    baseRate,
    debouncedStandardHours,
    debouncedBaseRate,
    callEndPoint,
    snackbar,
  ]);
};

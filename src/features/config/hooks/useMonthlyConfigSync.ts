import { useEffect, useRef } from "react";

import { useAppSnackbar } from "@/hooks/useAppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useFetch } from "@/hooks/useFetch";
import { useGlobalState } from "@/hooks/useGlobalState";
import { monthlyConfigService } from "@/services";

export const useMonthlyConfigSync = () => {
  const { user } = useAuth();
  const { year, month, standardHours, baseRate, updateStandardHours, updateBaseRate } =
    useGlobalState();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();

  // Guards the write-through effect from firing before hydration resolves for
  // the current (user, year, month), so it never overwrites a persisted
  // config with the in-memory defaults on first render.
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydratedKeyRef.current = null;
      return;
    }

    const key = `${user.id}:${year}:${month}`;
    if (hydratedKeyRef.current === key) return;

    let cancelled = false;

    void callEndPoint(monthlyConfigService().fetch(user.id, year, month)).then((result) => {
      if (cancelled) return;
      hydratedKeyRef.current = key;

      if (result.error) {
        snackbar.error(result.error);
        return;
      }

      if (result.data) {
        updateStandardHours(result.data.standard_hours);
        updateBaseRate(result.data.base_rate);
      }
    });

    return () => {
      cancelled = true;
    };
    // snackbar isn't referentially stable (AppSnackbarProvider doesn't memoize
    // its context value), so it's read via the closure instead of listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month, callEndPoint, updateStandardHours, updateBaseRate]);

  const debouncedStandardHours = useDebounce({ value: standardHours });
  const debouncedBaseRate = useDebounce({ value: baseRate });

  useEffect(() => {
    if (!user) return;
    if (hydratedKeyRef.current !== `${user.id}:${year}:${month}`) return;

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
    // snackbar isn't referentially stable (see comment above) - read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month, debouncedStandardHours, debouncedBaseRate, callEndPoint]);
};

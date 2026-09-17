import { useCallback, useEffect, useRef, useState } from "react";

import {
  useAppSnackbar,
  useAuth,
  useDomain,
  useFetch,
  useGlobalState,
} from "@/hooks";
import { monthlyConfigService } from "@/services";

export const useShabbatCreditCarryOver = () => {
  const { user } = useAuth();
  const { year, month } = useGlobalState();
  const { services } = useDomain();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();
  const [carriedOverHours, setCarriedOverHours] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const previousUnusedHoursRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const previous = services.dateService.getPreviousMonth(year, month);

    void callEndPoint(
      monthlyConfigService().fetch(user.id, previous.year, previous.month),
    ).then((result) => {
      if (cancelled) return;

      if (result.error) {
        snackbar.error(result.error);
        setCarriedOverHours(0);
      } else {
        setCarriedOverHours(result.data?.unused_shabbat_credit_hours ?? 0);
      }
      previousUnusedHoursRef.current = null;
      setResolvedKey(`${user.id}:${year}:${month}`);
    });

    return () => {
      cancelled = true;
    };
  }, [user, year, month, services, callEndPoint, snackbar]);

  const persistUnusedHours = useCallback((unusedHours: number) => {
    if (!user || resolvedKey !== `${user.id}:${year}:${month}`) return;
    if (previousUnusedHoursRef.current === unusedHours) return;
    previousUnusedHoursRef.current = unusedHours;

    void callEndPoint(
      monthlyConfigService().setUnusedShabbatCreditHours(
        user.id,
        year,
        month,
        unusedHours,
      ),
    ).then((result) => {
      if (result.error) snackbar.error(result.error);
    });
  }, [callEndPoint, month, resolvedKey, snackbar, user, year]);

  return { carriedOverHours, persistUnusedHours };
};

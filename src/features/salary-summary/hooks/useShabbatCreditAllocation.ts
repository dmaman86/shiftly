import { useEffect, useMemo, useRef, useState } from "react";

import { allocateShabbatCredit } from "@/domain";
import { useAppSnackbar } from "@/hooks/useAppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { useDomain } from "@/hooks/useDomain";
import { useFetch } from "@/hooks/useFetch";
import { useGlobalState } from "@/hooks/useGlobalState";
import { useGlobalStore } from "@/store/globalStore";
import { useWorkDays } from "@/hooks/useWorkDays";
import { monthlyConfigService } from "@/services";

export const useShabbatCreditAllocation = () => {
  const { user } = useAuth();
  const { year, month } = useGlobalState();
  const domain = useDomain();
  const { services } = domain;
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();

  const { workDays } = useWorkDays(domain);
  const dailyPayMaps = useGlobalStore((state) => state.dailyPayMaps);
  const standardHours = useGlobalStore((state) => state.config.standardHours);

  const [carriedOverHours, setCarriedOverHours] = useState(0);
  // Tracks which (user, year, month) the carry-over fetch has resolved for,
  // as STATE rather than a ref: the write-back effect below needs a
  // guaranteed re-render on resolution to re-check its guard, and
  // carriedOverHours alone doesn't provide that when the fetched value
  // happens to equal its previous value (e.g. 0 -> 0, the common case of no
  // prior unused credit) - React skips the re-render for an unchanged state
  // value, so a distinct key string is what reliably triggers it here.
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const prevUnusedRef = useRef<number | null>(null);

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
      // Reset so a coincidental match against a DIFFERENT month's last
      // written unusedHours doesn't wrongly skip this month's write.
      prevUnusedRef.current = null;
      setResolvedKey(`${user.id}:${year}:${month}`);
    });

    return () => {
      cancelled = true;
    };
  }, [user, year, month, services, callEndPoint, snackbar]);

  const allocation = useMemo(
    () =>
      allocateShabbatCredit({
        workDays,
        dailyPayMaps,
        standardHours,
        carriedOverHours: user ? carriedOverHours : 0,
      }),
    [workDays, dailyPayMaps, standardHours, carriedOverHours, user],
  );

  useEffect(() => {
    if (!user) return;
    if (resolvedKey !== `${user.id}:${year}:${month}`) return;
    if (prevUnusedRef.current === allocation.unusedHours) return;
    prevUnusedRef.current = allocation.unusedHours;

    void callEndPoint(
      monthlyConfigService().setUnusedShabbatCreditHours(
        user.id,
        year,
        month,
        allocation.unusedHours,
      ),
    ).then((result) => {
      if (result.error) snackbar.error(result.error);
    });
  }, [
    user,
    year,
    month,
    resolvedKey,
    allocation.unusedHours,
    callEndPoint,
    snackbar,
  ]);

  return allocation;
};

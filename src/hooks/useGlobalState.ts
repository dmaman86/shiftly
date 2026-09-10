import { useGlobalStore } from "@/store/globalStore";

export const useGlobalState = () => {
  const year = useGlobalStore((state) => state.config.year);
  const month = useGlobalStore((state) => state.config.month);
  const standardHours = useGlobalStore((state) => state.config.standardHours);
  const baseRate = useGlobalStore((state) => state.config.baseRate);
  const updateYear = useGlobalStore((state) => state.updateYear);
  const updateMonth = useGlobalStore((state) => state.updateMonth);
  const updateStandardHours = useGlobalStore((state) => state.updateStandardHours);
  const updateBaseRate = useGlobalStore((state) => state.updateBaseRate);
  const updateDayPayMap = useGlobalStore((state) => state.updateDayPayMap);
  const removeDay = useGlobalStore((state) => state.removeDay);
  const reset = useGlobalStore((state) => state.reset);

  return {
    year,
    month,
    standardHours,
    baseRate,
    updateYear,
    updateMonth,
    updateStandardHours,
    updateBaseRate,
    updateDayPayMap,
    removeDay,
    reset,
  };
};

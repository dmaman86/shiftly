import { createContext, useContext, ReactNode, useMemo } from "react";
import {
  ShiftMapBuilder,
  DayPayMapBuilder,
  MonthPayMapCalculator,
  buildPayMapPipeline,
  HolidayResolver,
  PerDiemRateResolver,
  WorkDaysForMonthBuilder,
  DayInfoResolver,
  MonthResolver,
} from "@/domain";

export type DomainContextType = {
  payMap: {
    shiftMapBuilder: ShiftMapBuilder;
    dayPayMapBuilder: DayPayMapBuilder;
    monthPayMapCalculator: MonthPayMapCalculator;
    workDaysMonthBuilder: WorkDaysForMonthBuilder;
  };
  resolvers: {
    holidayResolver: HolidayResolver;
    perDiemResolver: PerDiemRateResolver;
    dayInfoResolver: DayInfoResolver;
    monthResolver: MonthResolver;
  };
};

const DomainContext = createContext<DomainContextType | null>(null);

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const payMapPipeline = useMemo(() => buildPayMapPipeline(), []);

  const value: DomainContextType = {
    payMap: {
      shiftMapBuilder: payMapPipeline.payMap.shiftMapBuilder,
      dayPayMapBuilder: payMapPipeline.payMap.dayPayMapBuilder,
      monthPayMapCalculator: payMapPipeline.payMap.monthPayMapCalculator,
      workDaysMonthBuilder: payMapPipeline.payMap.workDaysForMonthBuilder,
    },
    resolvers: {
      holidayResolver: payMapPipeline.resolvers.holidayResolver,
      perDiemResolver: payMapPipeline.resolvers.perDiemRateResolver,
      dayInfoResolver: payMapPipeline.resolvers.workDayInfoResolver,
      monthResolver: payMapPipeline.resolvers.monthResolver,
    },
  };

  return (
    <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
  );
};

export const useDomain = () => {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomain must be used within DomainProvider");
  return ctx;
};

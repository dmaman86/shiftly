import {
  buildPayMapPipeline,
  DayInfoResolver,
  DayPayMapBuilder,
  HolidayResolver,
  MonthPayMapReducer,
  MonthResolver,
  PerDiemRateResolver,
  ShiftMapBuilder,
  TimelineMealAllowanceRateResolver,
  WorkDaysForMonthBuilder,
} from "@/domain";

export type DomainContextType = {
  payMap: {
    shiftMapBuilder: ShiftMapBuilder;
    dayPayMapBuilder: DayPayMapBuilder;
    monthPayMapCalculator: MonthPayMapReducer;
    workDaysMonthBuilder: WorkDaysForMonthBuilder;
  };
  resolvers: {
    holidayResolver: HolidayResolver;
    perDiemResolver: PerDiemRateResolver;
    dayInfoResolver: DayInfoResolver;
    monthResolver: MonthResolver;
    mealAllowanceRateResolver: TimelineMealAllowanceRateResolver;
  };
};

const pipelineInstance = buildPayMapPipeline();

export const domain: DomainContextType = {
  payMap: {
    shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
    dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
    monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
    workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
  },
  resolvers: {
    holidayResolver: pipelineInstance.resolvers.holidayResolver,
    perDiemResolver: pipelineInstance.resolvers.perDiemRateResolver,
    dayInfoResolver: pipelineInstance.resolvers.workDayInfoResolver,
    monthResolver: pipelineInstance.resolvers.monthResolver,
    mealAllowanceRateResolver:
      pipelineInstance.resolvers.mealAllowanceRateResolver,
  },
};

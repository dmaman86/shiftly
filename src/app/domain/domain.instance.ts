import { buildPayMapPipeline } from "@/domain";
import { DomainContextType } from "./domain.types";

const pipelineInstance = buildPayMapPipeline({
  timeZone: "Asia/Jerusalem",
});

export const domain: DomainContextType = {
  payMap: {
    shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
    dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
    monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
    workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
  },
  resolvers: {
    holidayResolver: pipelineInstance.rateCalculators.holiday,
    perDiemResolver: pipelineInstance.rateCalculators.perDiemRate,
    dayInfoResolver: pipelineInstance.resolvers.workDayInfoResolver,
    monthResolver: pipelineInstance.resolvers.monthResolver,
    mealAllowanceRateResolver: pipelineInstance.rateCalculators.mealAllowanceRate,
  },
  services: {
    dateService: pipelineInstance.services.dateService,
    shiftService: pipelineInstance.services.shiftService,
  },
};

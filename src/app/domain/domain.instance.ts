import { buildPayMapPipeline } from "@/domain";
import { DomainContextType } from "./domain.types";

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
  services: {
    dateService: pipelineInstance.services.dateService,
    shiftService: pipelineInstance.services.shiftService,
  },
};

import { vi } from "vitest";
import { buildPayMapPipeline } from "@/domain";

// Initialize domain pipeline once for all tests
const pipelineInstance = buildPayMapPipeline();

vi.mock("@/app", () => ({
  domain: {
    payMap: {
      shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
      dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
      monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
      workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
      calculateDayFromShifts: pipelineInstance.payMap.calculateDayFromShifts,
    },
    resolvers: {
      holidayResolver: pipelineInstance.rateCalculators.holiday,
      perDiemResolver: pipelineInstance.rateCalculators.perDiem,
      dayInfoResolver: pipelineInstance.resolvers.workDayInfoResolver,
      monthResolver: pipelineInstance.resolvers.monthResolver,
      mealAllowanceRateResolver:
        pipelineInstance.rateCalculators.mealAllowanceRate,
    },
    services: {
      dateService: pipelineInstance.services.dateService,
      shiftService: pipelineInstance.services.shiftService,
    },
  },
}));

export { pipelineInstance };

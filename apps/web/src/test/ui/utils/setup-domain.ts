import { DefaultMonthResolver } from "@/app/months/month.resolver";
import { WorkDayInfoPresenter } from "@/app/domain/workdayinfo.presenter";
import { vi } from "vitest";
import { buildPayMapPipeline } from "@shiftly/domain";

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
      dayInfoResolver: new WorkDayInfoPresenter(
      pipelineInstance.resolvers.workDayInfoResolver,
      pipelineInstance.services.dateService,
    ),
      monthResolver: new DefaultMonthResolver(),
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

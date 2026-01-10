import { vi, beforeAll } from "vitest";
import { buildPayMapPipeline } from "@/domain";

// Initialize domain pipeline once for all tests
const pipelineInstance = buildPayMapPipeline();

// Mock the domain module before any tests run
beforeAll(() => {
  vi.mock("@/app", () => ({
    domain: {
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
    },
  }));
});

export { pipelineInstance };

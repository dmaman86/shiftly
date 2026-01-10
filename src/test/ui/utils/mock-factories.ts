import type { GlobalState } from "@/redux/states/globalSlice";
import type { WorkDaysState } from "@/redux/states/workDaysSlice";
import { pipelineInstance } from "./setup-domain";

const { payMap } = pipelineInstance;

/**
 * Factory to create mock GlobalState for testing
 */
export function createMockGlobalState(
  overrides?: Partial<GlobalState>
): GlobalState {
  return {
    config: {
      standardHours: 6.67,
      baseRate: 50,
      year: 2024,
      month: 1,
      ...overrides?.config,
    },
    dailyPayMaps: overrides?.dailyPayMaps ?? {},
    globalBreakdown:
      overrides?.globalBreakdown ??
      payMap.monthPayMapCalculator.createEmpty(),
  };
}

/**
 * Factory to create mock WorkDaysState for testing
 */
export function createMockWorkDaysState(
  overrides?: Partial<WorkDaysState>
): WorkDaysState {
  return {
    year: overrides?.year ?? 2024,
    month: overrides?.month ?? 1,
    workDays: overrides?.workDays ?? [],
  };
}

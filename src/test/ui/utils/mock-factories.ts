import type { GlobalState } from "@/redux/states/globalSlice";

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
  };
}

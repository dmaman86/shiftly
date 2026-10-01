import { beforeEach, describe, expect, it } from "vitest";
import type { WorkDayMap } from "@shiftly/domain";
import { initialGlobalState, useGlobalStore } from "@/store/globalStore";

const createDayPayMap = (totalHours: number) =>
  ({ totalHours }) as WorkDayMap;

describe("globalStore", () => {
  beforeEach(() => useGlobalStore.setState({ ...initialGlobalState, monthlyConfigContextKey: null }));

  it("stores and replaces a daily pay map without a derived summary", () => {
    const firstDayPayMap = createDayPayMap(4);
    const replacementDayPayMap = createDayPayMap(6);

    const store = useGlobalStore.getState();
    store.updateDayPayMap("2026-09-01", firstDayPayMap);
    store.updateDayPayMap("2026-09-01", replacementDayPayMap);
    const withReplacement = useGlobalStore.getState();

    expect(withReplacement.dailyPayMaps).toEqual({
      "2026-09-01": replacementDayPayMap,
    });
    expect(withReplacement).not.toHaveProperty("globalBreakdown");
  });

  it("removes a daily pay map", () => {
    useGlobalStore.getState().updateDayPayMap("2026-09-01", createDayPayMap(4));
    useGlobalStore.getState().removeDay("2026-09-01");
    const result = useGlobalStore.getState();

    expect(result.dailyPayMaps).toEqual({});
  });

  it("clears daily pay maps when the month changes", () => {
    useGlobalStore.getState().updateDayPayMap("2026-09-01", createDayPayMap(4));
    useGlobalStore.getState().updateMonth(10);
    const result = useGlobalStore.getState();

    expect(result.config.month).toBe(10);
    expect(result.dailyPayMaps).toEqual({});
  });

  it("initializes a month with default editable config and empty data", () => {
    const store = useGlobalStore.getState();
    store.updateStandardHours(8);
    store.updateBaseRate(75);
    store.updateDayPayMap("2026-09-01", createDayPayMap(4));

    store.initializeMonth(2027, 1);
    const result = useGlobalStore.getState();

    expect(result.config).toEqual({
      standardHours: 6.67,
      baseRate: 0,
      year: 2027,
      month: 1,
    });
    expect(result.dailyPayMaps).toEqual({});
  });

  it("initializes resolved values and their context in one notification", () => {
    useGlobalStore.getState().updateBaseRate(75);
    const observed: Array<{ baseRate: number; standardHours: number; key: string | null }> = [];
    const unsubscribe = useGlobalStore.subscribe((state) => {
      observed.push({ baseRate: state.config.baseRate, standardHours: state.config.standardHours, key: state.monthlyConfigContextKey });
    });
    try {
      useGlobalStore.getState().initializeMonth(2026, 8, { baseRate: 60, standardHours: 7.5 }, "user-1:2026:8");
      expect(observed).toEqual([{ baseRate: 60, standardHours: 7.5, key: "user-1:2026:8" }]);
    } finally { unsubscribe(); }
  });

  it("selects a month atomically without replacing editable values with defaults", () => {
    const store = useGlobalStore.getState();
    store.initializeMonth(2026, 8, { baseRate: 60, standardHours: 7.5 }, "user-1:2026:8");
    store.updateDayPayMap("2026-08-01", createDayPayMap(4));
    store.selectMonth(2027, 1);
    expect(useGlobalStore.getState().config).toEqual({ year: 2027, month: 1, baseRate: 60, standardHours: 7.5 });
    expect(useGlobalStore.getState().monthlyConfigContextKey).toBeNull();
    expect(useGlobalStore.getState().dailyPayMaps).toEqual({});
  });
});

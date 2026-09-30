import { beforeEach, describe, expect, it } from "vitest";
import type { WorkDayMap } from "@shiftly/domain";
import { initialGlobalState, useGlobalStore } from "@/store/globalStore";

const createDayPayMap = (totalHours: number) =>
  ({ totalHours }) as WorkDayMap;

describe("globalStore", () => {
  beforeEach(() => useGlobalStore.setState(initialGlobalState));

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
});

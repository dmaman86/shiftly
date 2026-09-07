import { describe, expect, it } from "vitest";
import type { WorkDayMap } from "@/domain";
import globalReducer, {
  removeDayPayMap,
  setDayPayMap,
  setMonth,
} from "@/redux/states/globalSlice";

const createDayPayMap = (totalHours: number) =>
  ({ totalHours }) as WorkDayMap;

describe("globalSlice", () => {
  it("stores and replaces a daily pay map without a derived summary", () => {
    const firstDayPayMap = createDayPayMap(4);
    const replacementDayPayMap = createDayPayMap(6);

    const withFirstValue = globalReducer(
      undefined,
      setDayPayMap({ dateKey: "2026-09-01", dayPayMap: firstDayPayMap }),
    );
    const withReplacement = globalReducer(
      withFirstValue,
      setDayPayMap({
        dateKey: "2026-09-01",
        dayPayMap: replacementDayPayMap,
      }),
    );

    expect(withReplacement.dailyPayMaps).toEqual({
      "2026-09-01": replacementDayPayMap,
    });
    expect(withReplacement).not.toHaveProperty("globalBreakdown");
  });

  it("removes a daily pay map", () => {
    const populatedState = globalReducer(
      undefined,
      setDayPayMap({
        dateKey: "2026-09-01",
        dayPayMap: createDayPayMap(4),
      }),
    );

    const result = globalReducer(
      populatedState,
      removeDayPayMap("2026-09-01"),
    );

    expect(result.dailyPayMaps).toEqual({});
  });

  it("clears daily pay maps when the month changes", () => {
    const populatedState = globalReducer(
      undefined,
      setDayPayMap({
        dateKey: "2026-09-01",
        dayPayMap: createDayPayMap(4),
      }),
    );

    const result = globalReducer(populatedState, setMonth(10));

    expect(result.config.month).toBe(10);
    expect(result.dailyPayMaps).toEqual({});
  });
});

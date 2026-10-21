import { SYSTEM_START_DATE } from "../constants/system.constant.js";
import type { MealAllowanceRates } from "../types/types.js";
import {
  assertCalendarDate,
  MonthlyTimeline,
  monthStart,
  type TimelineEntry,
  type TimelineResolution,
  type TimelineUnavailableReason,
} from "./timeline.js";

/**
 * The timeline-based reference values the pay rules read. Event-like data
 * (election days) is not a timeline and is resolved separately, through the
 * calendar event map.
 */
export type ReferenceTimelines = {
  /** Per-diem amount of one point (tier A), in shekels. */
  readonly perDiemPointRate: readonly TimelineEntry<number>[];
  readonly mealAllowanceRates: readonly TimelineEntry<MealAllowanceRates>[];
};

export type ReferenceKey = keyof ReferenceTimelines;

export type ReferenceValue<K extends ReferenceKey> =
  ReferenceTimelines[K][number]["value"];

export interface ReferenceResolver {
  /**
   * The value of a reference on a date (YYYY-MM-DD). Dates before
   * SYSTEM_START_DATE are out_of_range whatever the data says.
   */
  resolve<K extends ReferenceKey>(
    key: K,
    on: string,
  ): TimelineResolution<ReferenceValue<K>>;
}

/** A calculation needed a reference value that does not exist for its date. */
export class ReferenceValueUnavailableError extends Error {
  readonly key: ReferenceKey;
  readonly on: string;
  readonly reason: TimelineUnavailableReason;

  constructor(
    key: ReferenceKey,
    on: string,
    reason: TimelineUnavailableReason,
  ) {
    super(`${key} is unavailable on ${on} (${reason})`);
    this.name = "ReferenceValueUnavailableError";
    this.key = key;
    this.on = on;
    this.reason = reason;
  }
}

/** Validates every timeline up front; invalid data fails here, not mid-calculation. */
export function createReferenceResolver(
  timelines: ReferenceTimelines,
): ReferenceResolver {
  const compiled: {
    readonly [K in ReferenceKey]: MonthlyTimeline<ReferenceValue<K>>;
  } = {
    perDiemPointRate: new MonthlyTimeline(
      "perDiemPointRate",
      timelines.perDiemPointRate,
    ),
    mealAllowanceRates: new MonthlyTimeline(
      "mealAllowanceRates",
      timelines.mealAllowanceRates,
    ),
  };

  return {
    resolve<K extends ReferenceKey>(
      key: K,
      on: string,
    ): TimelineResolution<ReferenceValue<K>> {
      assertCalendarDate(on);
      if (on < SYSTEM_START_DATE) {
        return { status: "unavailable", reason: "out_of_range" };
      }
      // The mapped type above ties each key to its timeline; TypeScript
      // cannot follow that through an indexed access on a generic key.
      const timeline = compiled[key] as MonthlyTimeline<ReferenceValue<K>>;
      return timeline.resolve(on);
    },
  };
}

/**
 * The value that applies to a whole month (monthly references change on the
 * first day). Throws ReferenceValueUnavailableError instead of returning a
 * zero rate the pay would silently use.
 */
export function requireMonthValue<K extends ReferenceKey>(
  references: ReferenceResolver,
  key: K,
  params: { year: number; month: number },
): ReferenceValue<K> {
  const on = monthStart(params.year, params.month);
  const resolution = references.resolve(key, on);
  if (resolution.status === "unavailable") {
    throw new ReferenceValueUnavailableError(key, on, resolution.reason);
  }
  return resolution.value;
}

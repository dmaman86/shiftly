import type { PerDiemCalculator } from "../../types/services.js";
import type { PerDiemShiftInfo } from "../../types/types.js";
import { BASELINE_REFERENCES } from "../../reference/baseline.js";
import {
  requireMonthValue,
  type ReferenceResolver,
} from "../../reference/reference-resolver.js";

const TIER_C_MIN_HOURS = 12;
const TIER_B_MIN_HOURS = 8;
const TIER_A_MIN_HOURS = 4;

/** Owns the per-diem tier rules; the rate comes from the reference timelines. */
export class TimelinePerDiemCalculator implements PerDiemCalculator {
  private readonly references: ReferenceResolver;

  constructor(references: ReferenceResolver = BASELINE_REFERENCES) {
    this.references = references;
  }

  calculateRate(params: { year: number; month: number }): number {
    return requireMonthValue(this.references, "perDiemPointRate", params);
  }

  calculateDay(params: { shifts: PerDiemShiftInfo[]; rate: number }) {
    const isFieldDutyDay = params.shifts.some(
      (shift) => shift.isFieldDutyShift,
    );

    const totalHours = params.shifts
      .filter((shift) => shift.isFieldDutyShift)
      .reduce((sum, shift) => sum + shift.hours, 0);

    if (!isFieldDutyDay) {
      return {
        isFieldDutyDay: false,
        diemInfo: { tier: null, points: 0, amount: 0 },
      };
    }

    const { tier, points } = this.getTier(totalHours);

    return {
      isFieldDutyDay: true,
      diemInfo: {
        tier,
        points,
        amount: params.rate * points,
      },
    };
  }

  private getTier(totalHours: number): {
    tier: "A" | "B" | "C" | null;
    points: number;
  } {
    if (totalHours >= TIER_C_MIN_HOURS) {
      return { tier: "C", points: 3 };
    }
    if (totalHours >= TIER_B_MIN_HOURS) {
      return { tier: "B", points: 2 };
    }
    if (totalHours >= TIER_A_MIN_HOURS) {
      return { tier: "A", points: 1 };
    }
    return { tier: null, points: 0 };
  }
}

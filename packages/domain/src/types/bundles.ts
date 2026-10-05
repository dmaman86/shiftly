import type { FixedSegmentCalculator } from "../calculator/fixed-segment.calculator.js";
import { Reducer } from "./core-behaviors.js";
import {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "./data-shapes.js";
import type {
  MealAllowanceCalculator,
  PerDiemCalculator,
  RegularCalculator,
} from "./services.js";

export type PayCalculationBundle = {
  regular: RegularCalculator;
  extra: Reducer<ExtraBreakdown>;
  special: Reducer<SpecialBreakdown>;
};

export type WorkDayReducerBundle = {
  regular: Reducer<RegularBreakdown>;
  extra: Reducer<ExtraBreakdown>;
  special: Reducer<SpecialBreakdown>;
};

export type FixedSegmentBundle = {
  sick: FixedSegmentCalculator;
  vacation: FixedSegmentCalculator;
  earnedShabbatCredit: FixedSegmentCalculator;
};

export type PerDiemBundle = {
  calculator: PerDiemCalculator;
};

export type MealAllowanceBundle = {
  calculator: MealAllowanceCalculator;
};

export type { MealAllowanceDayInfo } from "./data-shapes.js";

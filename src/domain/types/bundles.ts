import { FixedSegmentCalculator } from "../calculator";
import { Reducer } from "./core-behaviors";
import {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "./data-shapes";
import { MealAllowanceCalculator, PerDiemCalculator, RegularCalculator } from "./services";

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

export type MealAllowanceDayInfo = {
  totalHours: number;
  nightHours: number;
  isFieldDutyDay: boolean;
};

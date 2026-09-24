import { FixedSegmentCalculator } from "../calculator";
import { Reducer } from "./core-behaviors";
import {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "./data-shapes";
import {
  MealAllowanceCalculator,
  PerDiemCalculator,
  RegularCalculator,
  ShiftRegularCalculator,
} from "./services";
import { ClassifiedInterval } from "./types";

type ClassifiedIntervalCalculator<Output> = {
  calculateClassified: (intervals: ClassifiedInterval[]) => Output;
};

export type PayCalculationBundle = {
  regular: RegularCalculator;
  extra: Reducer<ExtraBreakdown> & ClassifiedIntervalCalculator<ExtraBreakdown>;
  special: Reducer<SpecialBreakdown> &
    ClassifiedIntervalCalculator<SpecialBreakdown>;
};

export type ShiftPayCalculationBundle = Omit<PayCalculationBundle, "regular"> & {
  regular: ShiftRegularCalculator;
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

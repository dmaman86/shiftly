import { FixedSegmentCalculator } from "../calculator";
import { MealAllowanceMonthReducer } from "../reducer";
import { Calculator, Reducer } from "./core-behaviors";
import {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "./data-shapes";
import {
  MealAllowanceLogicCalculator,
  MealAllowanceRateCalculator,
  PerDiemDayCalculator,
  PerDiemMonthReducer,
  PerDiemRateCalculator,
  RegularCalculator,
} from "./services";
import { LabeledSegmentRange } from "./types";

export type PayCalculationBundle = {
  regular: RegularCalculator;
  extra: Reducer<ExtraBreakdown> &
    Calculator<LabeledSegmentRange[], ExtraBreakdown>;
  special: Reducer<SpecialBreakdown> &
    Calculator<LabeledSegmentRange[], SpecialBreakdown>;
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
  calculator: PerDiemDayCalculator;
  rateResolver: PerDiemRateCalculator;
};

export type MealAllowanceBundle = {
  resolver: MealAllowanceLogicCalculator;
  rateResolver: MealAllowanceRateCalculator;
};

export type MealAllowanceMonthBundle = {
  perDiem: PerDiemMonthReducer;
  mealAllowance: MealAllowanceMonthReducer;
};

export type MealAllowanceDayInfo = {
  totalHours: number;
  nightHours: number;
  isFieldDutyDay: boolean;
};

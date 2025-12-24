import { FixedSegmentFactory } from "../factory";
import { MealAllowanceMonthReducer } from "../reducer";
import { Calculator, Reducer } from "./core-behaviors";
import {
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
} from "./data-shapes";
import {
  MealAllowanceLogicResolver,
  MealAllowanceRateResolver,
  PerDiemDayCalculator,
  PerDiemMonthReducer,
  PerDiemRateResolver,
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
  sick: FixedSegmentFactory;
  vacation: FixedSegmentFactory;
  extraShabbat: FixedSegmentFactory;
};

export type PerDiemBundle = {
  calculator: PerDiemDayCalculator;
  rateResolver: PerDiemRateResolver;
};

export type MealAllowanceBundle = {
  resolver: MealAllowanceLogicResolver;
  rateResolver: MealAllowanceRateResolver;
};

export type MealAllowanceMonthBundle = {
  perDiem: PerDiemMonthReducer;
  mealAllowance: MealAllowanceMonthReducer;
};

export type MealAllowanceDayInfo = {
  totalHours: number;
  hasMorning: boolean;
  hasNight: boolean;
  isFieldDutyDay: boolean;
};

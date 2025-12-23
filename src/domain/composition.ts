import {
  ExtraCalculator,
  RegularFactory,
  SpecialCalculator,
  DefaultPerDiemShiftCalculator,
  DefaultPerDiemDayCalculator,
  DefaultPerDiemMonthCalculator,
  DefaultShiftMapBuilder,
  TimelinePerDiemRateResolver,
  MonthPayMapReducer,
  ShiftResolverFactory,
  DefaultDayPayMapBuilder,
  HolidayResolverService,
  FixedSegmentFactory,
  WorkDayInfoResolver,
  DefaultWorkDaysForMonthBuilder,
  DefaultMonthResolver,
  LargeMealAllowanceCalculator,
  SmallMealAllowanceCalculator,
  TimelineMealAllowanceRateResolver,
  MealAllowanceResolver,
  PayCalculationBundle,
  FixedSegmentBundle,
  PerDiemBundle,
  MealAllowanceBundle,
  WorkDayReducerBundle,
  FixedSegmentMonthReducer,
  MealAllowanceMonthReducer,
} from "@/domain";
import { WorkDayMonthReducer } from "./reducer/workday-month.reducer";

export const buildPayMapPipeline = () => {
  const shiftResolver = ShiftResolverFactory.create();

  const regularByShift = RegularFactory.byShift();
  const regularByDay = RegularFactory.byDay();
  const regularAccumulator = RegularFactory.monthReducer();

  const extraCalculator = new ExtraCalculator();
  const specialCalculator = new SpecialCalculator();
  const sickCalculator = new FixedSegmentFactory();
  const vacationCalculator = new FixedSegmentFactory();
  const extraShabbatCalculator = new FixedSegmentFactory();

  const largeMealAllowanceCalculator = new LargeMealAllowanceCalculator();
  const smallMealAllowanceCalculator = new SmallMealAllowanceCalculator();

  const perdiemShiftCalculator = new DefaultPerDiemShiftCalculator();
  const perDiemDayCalculator = new DefaultPerDiemDayCalculator();
  const perDiemMonthCalculator = new DefaultPerDiemMonthCalculator();
  const perDiemRateResolver = new TimelinePerDiemRateResolver();
  const mealAllowanceRateResolver = new TimelineMealAllowanceRateResolver();

  const shiftsCalculators: PayCalculationBundle = {
    regular: regularByShift,
    extra: extraCalculator,
    special: specialCalculator,
  };

  const shiftMapBuilder = new DefaultShiftMapBuilder(
    shiftResolver,
    shiftsCalculators,
    perdiemShiftCalculator,
  );

  const holidayResolver = new HolidayResolverService();

  const workDayInfoResolver = new WorkDayInfoResolver();

  const workDaysForMonthBuilder = new DefaultWorkDaysForMonthBuilder(
    holidayResolver,
    workDayInfoResolver,
  );

  const monthResolver = new DefaultMonthResolver();

  const fixedSegmentBundle: FixedSegmentBundle = {
    sick: sickCalculator,
    vacation: vacationCalculator,
    extraShabbat: extraShabbatCalculator,
  };

  const mealAllowanceResolver = new MealAllowanceResolver(
    largeMealAllowanceCalculator,
    smallMealAllowanceCalculator,
  );

  const payCalculatorBundle: PayCalculationBundle = {
    regular: regularByDay,
    extra: extraCalculator,
    special: specialCalculator,
  };

  const perDiemBundle: PerDiemBundle = {
    calculator: perDiemDayCalculator,
    rateResolver: perDiemRateResolver,
  };

  const mealAllowanceBundle: MealAllowanceBundle = {
    resolver: mealAllowanceResolver,
    rateResolver: mealAllowanceRateResolver,
  };

  const dayPayMapBuilder = new DefaultDayPayMapBuilder(
    payCalculatorBundle,
    fixedSegmentBundle,
    perDiemBundle,
    mealAllowanceBundle,
  );

  const workPay: WorkDayReducerBundle = {
    regular: regularAccumulator,
    extra: extraCalculator,
    special: specialCalculator,
  };

  const workPayMonthReducer = new WorkDayMonthReducer(workPay);

  const fixed: FixedSegmentMonthReducer = new FixedSegmentMonthReducer(
    fixedSegmentBundle,
  );

  const allowances: MealAllowanceMonthReducer = new MealAllowanceMonthReducer();

  const monthPayMapCalculator = new MonthPayMapReducer(
    workPayMonthReducer,
    fixed,
    allowances,
    perDiemMonthCalculator,
  );

  return {
    payMap: {
      shiftMapBuilder,
      dayPayMapBuilder,
      monthPayMapCalculator,
      workDaysForMonthBuilder,
    },
    resolvers: {
      perDiemRateResolver,
      holidayResolver,
      workDayInfoResolver,
      monthResolver,
      mealAllowanceRateResolver,
    },
  };
};

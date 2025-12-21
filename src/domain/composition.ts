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
} from "@/domain";

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

  const perdiemShiftCalculator = new DefaultPerDiemShiftCalculator();
  const perDiemDayCalculator = new DefaultPerDiemDayCalculator();
  const perDiemMonthCalculator = new DefaultPerDiemMonthCalculator();
  const perDiemRateResolver = new TimelinePerDiemRateResolver();

  const holidayResolver = new HolidayResolverService();

  const workDayInfoResolver = new WorkDayInfoResolver();
  const monthResolver = new DefaultMonthResolver();

  const workDaysForMonthBuilder = new DefaultWorkDaysForMonthBuilder(
    holidayResolver,
    workDayInfoResolver,
  );

  const shiftMapBuilder = new DefaultShiftMapBuilder(
    shiftResolver,
    regularByShift,
    extraCalculator,
    specialCalculator,
    perdiemShiftCalculator,
  );

  const dayPayMapBuilder = new DefaultDayPayMapBuilder(
    regularByDay,
    extraCalculator,
    specialCalculator,
    sickCalculator,
    vacationCalculator,
    extraShabbatCalculator,
    perDiemDayCalculator,
    perDiemRateResolver,
  );

  const monthPayMapCalculator = new MonthPayMapReducer(
    regularAccumulator,
    extraCalculator,
    specialCalculator,
    sickCalculator,
    vacationCalculator,
    extraShabbatCalculator,
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
    },
  };
};

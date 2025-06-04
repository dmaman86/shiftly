import {
  PaySegment,
  ExtraBreakdown,
  RegularBreakdown,
  SpecialBreakdown,
  WorkDayPayMap,
} from "../types/types";

import { fieldShiftPercent as defaultFieldShiftPercent } from "@/constants";
import { paySegmentFactory } from "./paySegmentFactory.service";
import { segmentsService } from "./segments.service";
import { subtractValues } from "@/utils";

export const breakdownService = (
  fieldShiftPercent: Record<string, number> = defaultFieldShiftPercent,
  segmentsServiceFactory: () => ReturnType<
    typeof segmentsService
  > = segmentsService,
) => {
  const { hours50, hours20, hours100, hours125, hours150, hours200 } =
    fieldShiftPercent;

  const { Regular, Extra, Special, sumSegments, subtractSegments } =
    segmentsServiceFactory();

  const buildBreakdown = ({
    regular,
    extra,
    special,
    hours100Sick,
    hours100Vacation,
    extra100Shabbat,
    totalHours,
    baseRate,
  }: {
    regular: RegularBreakdown;
    extra: ExtraBreakdown;
    special: SpecialBreakdown;
    hours100Sick: PaySegment;
    hours100Vacation: PaySegment;
    extra100Shabbat: PaySegment;
    totalHours: number;
    baseRate: number;
  }): WorkDayPayMap => {
    return {
      regular,
      extra,
      special,
      hours100Sick,
      hours100Vacation,
      extra100Shabbat,
      baseRate,
      totalHours,
      getTotalPay() {
        const all = [
          ...Object.values(this.regular),
          ...Object.values(this.extra),
          ...Object.values(this.special),
          this.hours100Sick,
          this.hours100Vacation,
          this.extra100Shabbat,
        ];
        return this.baseRate > 0
          ? all.reduce((sum, seg) => sum + seg.total, 0)
          : 0;
      },
    };
  };

  const initBreakdown = ({
    baseRate = 0,
    breakdown,
  }: {
    baseRate?: number;
    breakdown?: WorkDayPayMap;
  }): WorkDayPayMap => {
    const regular = Regular.init(
      {
        hours100,
        hours125,
        hours150,
      },
      baseRate,
      breakdown?.regular,
    );
    const extra = Extra.init({ hours20, hours50 }, baseRate, breakdown?.extra);
    const special = Special.init(
      { shabbat150: hours150, shabbat200: hours200 },
      baseRate,
      breakdown?.special,
    );
    const hours100Sick = paySegmentFactory({
      percent: hours100,
      hours: breakdown?.hours100Sick?.hours ?? 0,
      baseRate,
    });
    const hours100Vacation = paySegmentFactory({
      percent: hours100,
      hours: breakdown?.hours100Vacation?.hours ?? 0,
      baseRate,
    });
    const extra100Shabbat = paySegmentFactory({
      percent: hours100,
      hours: breakdown?.extra100Shabbat?.hours ?? 0,
      baseRate,
    });
    const totalHours = breakdown?.totalHours ?? 0;

    return buildBreakdown({
      regular,
      extra,
      special,
      hours100Sick,
      hours100Vacation,
      extra100Shabbat,
      totalHours,
      baseRate,
    });
  };

  const mergeBreakdowns = (
    a: WorkDayPayMap,
    b: WorkDayPayMap,
    operation: (a: PaySegment, b: PaySegment, baseRate: number) => PaySegment,
  ): WorkDayPayMap => {
    const regular = Regular.merge(a.regular, b.regular, operation, a.baseRate);
    const extra = Extra.merge(a.extra, b.extra, operation, a.baseRate);
    const special = Special.merge(a.special, b.special, operation, a.baseRate);

    const hours100Sick = operation(a.hours100Sick, b.hours100Sick, a.baseRate);
    const hours100Vacation = operation(
      a.hours100Vacation,
      b.hours100Vacation,
      a.baseRate,
    );
    const extra100Shabbat = operation(
      a.extra100Shabbat,
      b.extra100Shabbat,
      a.baseRate,
    );

    const totalHours =
      operation === sumSegments
        ? a.totalHours + b.totalHours
        : subtractValues(a.totalHours, b.totalHours);

    const baseRate = Math.max(a.baseRate, b.baseRate);

    return buildBreakdown({
      regular,
      extra,
      special,
      hours100Sick,
      hours100Vacation,
      extra100Shabbat,
      totalHours,
      baseRate,
    });
  };

  const updateBaseRate = (
    newRate: number,
    breakdown: WorkDayPayMap,
  ): WorkDayPayMap => {
    return initBreakdown({ baseRate: newRate, breakdown });
  };

  return {
    initBreakdown,
    buildBreakdown,
    mergeBreakdowns,
    sumSegments,
    subtractSegments,
    updateBaseRate,
  };
};

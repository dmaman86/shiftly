import { MealAllowanceRates, PayBreakdownViewModel, Segment } from "@/domain";
import {
  mapSegmentsToPayRows,
  mapAllowanceRows,
  PayRowVM,
} from "@/features/salary-summary";

type BuildRowsParams = {
  payVM: PayBreakdownViewModel;
  baseRate?: number;
  allowanceRate?: MealAllowanceRates;
  rateDiem?: number;
};

export const buildBasePayRows = ({
  payVM,
  baseRate,
}: BuildRowsParams): PayRowVM[] => {
  if (baseRate === undefined) {
    throw new Error("baseRate is required for buildBasePayRows");
  }

  const baseMap: Record<string, Segment> = {
    "100%": payVM.regular.hours100,
    "שבת תוספת 100%": payVM.extra100Shabbat,
    מחלה: payVM.hours100Sick,
    חופש: payVM.hours100Vacation,
  };

  return mapSegmentsToPayRows(baseRate, baseMap);
};

export const buildExtraPayRows = ({
  payVM,
  baseRate,
}: BuildRowsParams): PayRowVM[] => {
  if (baseRate === undefined) {
    throw new Error("baseRate is required for buildExtraPayRows");
  }

  const extraMap: Record<string, Segment> = {
    "תוספת לילה (50%)": payVM.extra.hours50,
    "150%": payVM.regular.hours150,
    "125%": payVM.regular.hours125,
    "שבת 150%": payVM.special.shabbat150,
    "שבת 200%": payVM.special.shabbat200,
    "תוספת ערב (20%)": payVM.extra.hours20,
  };

  return mapSegmentsToPayRows(baseRate, extraMap);
};

export const buildAllowanceRowsFromPayVM = ({
  payVM,
  allowanceRate,
  rateDiem,
}: BuildRowsParams): PayRowVM[] => {
  if (allowanceRate === undefined || rateDiem === undefined) {
    throw new Error(
      "allowanceRate and rateDiem are required for buildAllowanceRowsFromPayVM",
    );
  }

  return mapAllowanceRows({
    perDiem: { points: payVM.perDiemPoints, rate: payVM.perDiemAmount },
    mealAllowance: {
      small: { points: payVM.smallPoints, amount: payVM.smallAmount },
      large: { points: payVM.largePoints, amount: payVM.largeAmount },
    },
    rates: allowanceRate,
    rateDiem,
  });
};

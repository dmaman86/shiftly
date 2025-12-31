import { MealAllowanceRates, PayBreakdownViewModel, Segment } from "@/domain";
import {
  mapSegmentsToPayRows,
  mapAllowanceRows,
} from "@/features/salary-summary";

export const buildBasePayRows = ({
  payVM,
  baseRate,
}: {
  payVM: PayBreakdownViewModel;
  baseRate: number;
}) => {
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
}: {
  payVM: PayBreakdownViewModel;
  baseRate: number;
}) => {
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
}: {
  payVM: PayBreakdownViewModel;
  allowanceRate: MealAllowanceRates;
  rateDiem: number;
}) => {
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

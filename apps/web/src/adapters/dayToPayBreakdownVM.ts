import type { WorkDayMap } from "@shiftly/domain";
import type { PayBreakdownViewModel } from "@/app/types";
import { payMapToPayBreakdownVM } from "./payMapToPayBreakdownVM";

export const dayToPayBreakdownVM = (
  day: WorkDayMap,
  shabbatCreditHours: number,
): PayBreakdownViewModel =>
  payMapToPayBreakdownVM(
    {
      ...day,
      ...day.workMap,
      totalHours: day.totalHours,
      perDiem: day.perDiem.diemInfo,
    },
    shabbatCreditHours,
  );

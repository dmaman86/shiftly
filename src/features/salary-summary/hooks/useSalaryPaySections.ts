import { useMemo } from "react";

import { MealAllowanceRates, PayBreakdownViewModel } from "@/domain";
import {
  buildAllowanceRowsFromPayVM,
  buildBasePayRows,
  buildExtraPayRows,
  usePayRowVM,
} from "@/features/salary-summary";

type UseSalaryPaySectionsParams = {
  payVM: PayBreakdownViewModel;
  baseRate: number;
  allowanceRate: MealAllowanceRates;
  rateDiem: number;
};

export const useSalaryPaySections = ({
  payVM,
  baseRate,
  allowanceRate,
  rateDiem,
}: UseSalaryPaySectionsParams) => {
  const baseInitialRows = useMemo(
    () => buildBasePayRows({ payVM, baseRate }),
    [payVM, baseRate],
  );

  const extraInitialRows = useMemo(
    () => buildExtraPayRows({ payVM, baseRate }),
    [payVM, baseRate],
  );

  const allowanceInitialRows = useMemo(
    () =>
      buildAllowanceRowsFromPayVM({
        payVM,
        allowanceRate,
        rateDiem,
      }),
    [payVM, allowanceRate, rateDiem],
  );
  const base = usePayRowVM(baseInitialRows);
  const extra = usePayRowVM(extraInitialRows);
  const allowance = usePayRowVM(allowanceInitialRows);

  return {
    base,
    extra,
    allowance,
  };
};

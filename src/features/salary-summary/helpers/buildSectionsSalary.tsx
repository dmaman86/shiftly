import { AccessTime, AddCircleOutline, Restaurant } from "@mui/icons-material";
import { PayBreakdownViewModel, MealAllowanceRates } from "@/domain";

import {
  createAllowanceSectionFactory,
  createBaseSectionFactory,
  createExtraSectionFactory,
} from "./sectionFactory";

type BuildSectionsSalaryParams = {
  payVM: PayBreakdownViewModel;
  baseRate: number;
  allowanceRate: MealAllowanceRates;
  rateDiem: number;
};

export const buildSectionsSalary = ({
  payVM,
  baseRate,
  allowanceRate,
  rateDiem,
}: BuildSectionsSalaryParams) => {
  return [
    createBaseSectionFactory("base", {
      title: "שעות בסיס",
      icon: <AccessTime color="primary" />,
      summaryLabel: "סה״כ שעות בסיס",
      color: "#1976d2",
      payVM,
      baseRate,
    }),

    createExtraSectionFactory("extra", {
      title: "תוספות ושעות נוספות",
      icon: <AddCircleOutline sx={{ color: "#ed6c02" }} />,
      summaryLabel: "סה״כ תוספות",
      color: "#ed6c02",
      payVM,
      baseRate,
    }),

    createAllowanceSectionFactory("allowance", {
      title: "אש״ל וכלכלה",
      icon: <Restaurant sx={{ color: "#2e7d32" }} />,
      summaryLabel: "סה״כ נלוות",
      color: "#2e7d32",
      payVM,
      allowanceRate,
      rateDiem,
    }),
  ];
};

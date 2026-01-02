import { AccessTime, AddCircleOutline, Restaurant } from "@mui/icons-material";
import { PayBreakdownViewModel, MealAllowanceRates } from "@/domain";
import {
  buildAllowanceRowsFromPayVM,
  buildBasePayRows,
  buildExtraPayRows,
} from "../mappers";
import { createSectionFactory } from "./sectionFactory";

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
    createSectionFactory("base", {
      title: "שעות בסיס",
      icon: <AccessTime color="primary" />,
      summaryLabel: "סה״כ שעות בסיס",
      color: "#1976d2",
      payVM,
      baseRate,
      buildRows: buildBasePayRows,
    }),
    createSectionFactory("extra", {
      title: "תוספות ושעות נוספות",
      icon: <AddCircleOutline sx={{ color: "#ed6c02" }} />,
      summaryLabel: "סה״כ תוספות",
      color: "#ed6c02",
      payVM,
      baseRate,
      buildRows: buildExtraPayRows,
    }),
    createSectionFactory("allowance", {
      title: "אש״ל וכלכלה",
      icon: <Restaurant sx={{ color: "#2e7d32" }} />,
      summaryLabel: "סה״כ נלוות",
      color: "#2e7d32",
      payVM,
      allowanceRate,
      rateDiem,
      buildRows: buildAllowanceRowsFromPayVM,
    }),
  ];
};

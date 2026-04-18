import type { useTranslation } from "react-i18next";
import { AccessTime, AddCircleOutline, Restaurant } from "@mui/icons-material";
import { PayBreakdownViewModel, MealAllowanceRates } from "@/domain";

import {
  createAllowanceSectionFactory,
  createBaseSectionFactory,
  createExtraSectionFactory,
} from "./sectionFactory";
import {
  buildAllowanceRows,
  buildBasePayRows,
  buildExtraPayRows,
} from "../mappers";

type TranslateFn = ReturnType<typeof useTranslation<"work-table">>["t"];

type BuildSectionsSalaryParams = {
  payVM: PayBreakdownViewModel;
  baseRate: number;
  allowanceRate: MealAllowanceRates;
  rateDiem: number;
  t: TranslateFn;
};

export const buildSectionsSalary = ({
  payVM,
  baseRate,
  allowanceRate,
  rateDiem,
  t,
}: BuildSectionsSalaryParams) => {
  return [
    createBaseSectionFactory("base", {
      title: t("salary_summary.base_hours_title"),
      icon: <AccessTime color="primary" />,
      summaryLabel: t("salary_summary.base_hours_summary"),
      color: "#1976d2",
      payVM,
      baseRate,
      buildRows: (vm, rate) => buildBasePayRows(vm, rate, t),
    }),

    createExtraSectionFactory("extra", {
      title: t("salary_summary.extras_title"),
      icon: <AddCircleOutline sx={{ color: "#ed6c02" }} />,
      summaryLabel: t("salary_summary.extras_summary"),
      color: "#ed6c02",
      payVM,
      baseRate,
      buildRows: (vm, rate) => buildExtraPayRows(vm, rate, t),
    }),

    createAllowanceSectionFactory("allowance", {
      title: t("salary_summary.allowance_title"),
      icon: <Restaurant sx={{ color: "#2e7d32" }} />,
      summaryLabel: t("salary_summary.allowance_summary"),
      color: "#2e7d32",
      payVM,
      allowanceRate,
      rateDiem,
      buildRows: (vm, rates, diem) => buildAllowanceRows(vm, rates, diem, t),
    }),
  ];
};

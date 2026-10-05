import type { useTranslation } from "react-i18next";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import type { PayBreakdownViewModel } from "@/app/types";
import { MealAllowanceRates } from "@shiftly/domain";

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
      icon: <AccessTimeIcon color="primary" />,
      summaryLabel: t("salary_summary.base_hours_summary"),
      tone: "base",
      payVM,
      baseRate,
      buildRows: (vm, rate) => buildBasePayRows(vm, rate, t),
    }),

    createExtraSectionFactory("extra", {
      title: t("salary_summary.extras_title"),
      icon: <AddCircleOutlineIcon sx={{ color: "pay.extras" }} />,
      summaryLabel: t("salary_summary.extras_summary"),
      tone: "extras",
      payVM,
      baseRate,
      buildRows: (vm, rate) => buildExtraPayRows(vm, rate, t),
    }),

    createAllowanceSectionFactory("allowance", {
      title: t("salary_summary.allowance_title"),
      icon: <RestaurantIcon sx={{ color: "pay.allowances" }} />,
      summaryLabel: t("salary_summary.allowance_summary"),
      tone: "allowances",
      payVM,
      allowanceRate,
      rateDiem,
      buildRows: (vm, rates, diem) => buildAllowanceRows(vm, rates, diem, t),
    }),
  ];
};

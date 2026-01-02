import { MealAllowanceRates, PayBreakdownViewModel } from "@/domain";

export type PayRowVM = {
  label: string;
  quantity: number;
  rate: number;
  total: number;
};

export type PayTableVM = {
  rows: PayRowVM[];
  total: number;
};

export type MonthlySalarySummaryVM = {
  baseRows: PayRowVM[];
  extraRows: PayRowVM[];
  perDiemRow: PayRowVM | null;
  monthlyTotal: number;
};

export type PaySectionVM = {
  rows: PayRowVM[];
  total: number;
};

type BaseSectionConfig = {
  id: string;
  title: string;
  icon: React.ReactNode;
  summaryLabel: string;
  color: string;
  payVM: PayBreakdownViewModel;
};

export type BasePaySectionConfig = BaseSectionConfig & {
  type: "base";
  baseRate: number;
  buildRows: (payVM: PayBreakdownViewModel, baseRate: number) => PayRowVM[];
};

export type ExtraPaySectionConfig = BaseSectionConfig & {
  type: "extra";
  baseRate: number;
  buildRows: (payVM: PayBreakdownViewModel, baseRate: number) => PayRowVM[];
};

export type AllowanceSectionConfig = BaseSectionConfig & {
  type: "allowance";
  allowanceRate: MealAllowanceRates;
  rateDiem: number;
  buildRows: (
    payVM: PayBreakdownViewModel,
    allowanceRate: MealAllowanceRates,
    rateDiem: number,
  ) => PayRowVM[];
};

export type SalarySectionConfig =
  | BasePaySectionConfig
  | ExtraPaySectionConfig
  | AllowanceSectionConfig;

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

export type SalarySectionConfig = {
  id: string;
  title: string;
  icon: React.ReactNode;
  summaryLabel: string;
  color: string;
  payVM: PayBreakdownViewModel;
  baseRate?: number;
  allowanceRate?: MealAllowanceRates;
  rateDiem?: number;
  buildRows: (params: {
    payVM: PayBreakdownViewModel;
    baseRate?: number;
    allowanceRate?: MealAllowanceRates;
    rateDiem?: number;
  }) => PayRowVM[];
};

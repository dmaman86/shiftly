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

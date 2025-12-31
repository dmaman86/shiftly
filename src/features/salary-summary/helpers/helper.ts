import { PayRowVM, PayTableVM } from "../vm";

export const calculateTotal = (rows: PayRowVM[]): number =>
  rows.reduce((sum, row) => sum + row.total, 0);

export const buildPayTable = (rows: PayRowVM[]): PayTableVM => ({
  rows,
  total: calculateTotal(rows),
});

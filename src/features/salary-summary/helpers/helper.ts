import type {
  PayRowVM,
  PayTableVM,
  SalaryQuantityOverrides,
} from "../vm";

export const calculateTotal = (rows: PayRowVM[]): number =>
  rows.reduce((sum, row) => sum + row.total, 0);

export const applyQuantityOverrides = (
  rows: PayRowVM[],
  sectionId: string,
  quantityOverrides: SalaryQuantityOverrides,
): PayRowVM[] =>
  rows.map((row) => {
    const quantity = quantityOverrides[`${sectionId}:${row.id}`];

    return quantity === undefined || quantity === row.quantity
      ? row
      : { ...row, quantity, total: quantity * row.rate };
  });

export const buildPayTable = (rows: PayRowVM[]): PayTableVM => ({
  rows,
  total: calculateTotal(rows),
});

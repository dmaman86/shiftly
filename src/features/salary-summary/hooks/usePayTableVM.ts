import { useEffect, useState } from "react";
import { buildPayTable } from "../helpers";
import { PayRowVM, PayTableVM } from "../vm";

export const usePayTableVM = (initialRows: PayRowVM[] = []) => {
  const [state, setState] = useState<PayTableVM>(() =>
    buildPayTable(initialRows),
  );

  const setRows = (rows: PayRowVM[]) => {
    setState(buildPayTable(rows));
  };

  const updateRowQuantity = (index: number, quantity: number) => {
    setState((prev) => {
      const rows = prev.rows.map((row, i) =>
        i === index ? { ...row, quantity, total: quantity * row.rate } : row,
      );

      return buildPayTable(rows);
    });
  };

  useEffect(() => {
    setState((prev) => {
      const hasChanged = prev.rows.some((row, index) => {
        const initial = initialRows[index];
        if (!initial || initial.label !== row.label) return true;

        return (
          initial.quantity !== row.quantity ||
          initial.rate !== row.rate ||
          initial.total !== row.total
        );
      });
      if (hasChanged || prev.rows.length !== initialRows.length) {
        return buildPayTable(initialRows);
      }

      const updatedRows = prev.rows.map((row) => {
        const next = initialRows.find((r) => r.label === row.label);
        if (!next) return row;

        // quantity stays, rate updates
        const rate = next.rate;
        const total = row.quantity * rate;

        return {
          ...row,
          rate,
          total,
        };
      });

      return buildPayTable(updatedRows);
    });
  }, [initialRows]);

  return {
    rows: state.rows,
    total: state.total,
    setRows,
    updateRowQuantity,
  };
};

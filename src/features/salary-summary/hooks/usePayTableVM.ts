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
    setState(buildPayTable(initialRows));
  }, [initialRows]);

  return {
    rows: state.rows,
    total: state.total,
    setRows,
    updateRowQuantity,
  };
};

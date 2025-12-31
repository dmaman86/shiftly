import { useMemo, useState, useEffect } from "react";
import { PayRowVM } from "@/features/salary-summary";

export const usePayRowVM = (initialRows: PayRowVM[]) => {
  const [rows, setRows] = useState<PayRowVM[]>(initialRows);

  useEffect(() => {
    setRows((prev) => {
      return prev.map((row) => {
        const updated = initialRows.find((r) => r.label === row.label);
        if (!updated) return row;
        return {
          ...row,
          rate: updated.rate,
          total: row.quantity * updated.rate,
        };
      });
    });
  }, [initialRows]);

  const updateRows = (index: number, quantity: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, quantity, total: quantity * row.rate } : row,
      ),
    );
  };

  const total = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.total, 0);
  }, [rows]);

  return {
    rows,
    updateRows,
    total,
  };
};

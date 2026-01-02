import { useEffect, useMemo, useState } from "react";
import { buildPayTable } from "../helpers";
import { PayRowVM, PayTableVM } from "../vm";
import { MealAllowanceRates, PayBreakdownViewModel } from "@/domain";

type BuildRowsFunction = (params: {
  payVM: PayBreakdownViewModel;
  baseRate?: number;
  allowanceRate?: MealAllowanceRates;
  rateDiem?: number;
}) => PayRowVM[];

type UsePayTableVMParams = {
  payVM: PayBreakdownViewModel;
  baseRate?: number;
  allowanceRate?: MealAllowanceRates;
  rateDiem?: number;
  buildRows: BuildRowsFunction;
};

export const usePayTableVM = ({
  payVM,
  baseRate,
  allowanceRate,
  rateDiem,
  buildRows,
}: UsePayTableVMParams) => {
  // Build rows from domain (recalculates when inputs change)
  const initialRows = useMemo(
    () => buildRows({ payVM, baseRate, allowanceRate, rateDiem }),
    [payVM, baseRate, allowanceRate, rateDiem, buildRows],
  );

  // State is derived from initialRows
  const [state, setState] = useState<PayTableVM>(() =>
    buildPayTable(initialRows),
  );

  const syncRow = (incomingRow: PayRowVM, currentRow?: PayRowVM): PayRowVM => {
    if (!currentRow) return incomingRow;

    const rateChanged = incomingRow.rate !== currentRow.rate;
    const quantityChanged = incomingRow.quantity !== currentRow.quantity;

    if (rateChanged) {
      return {
        ...incomingRow,
        quantity: currentRow.quantity,
        total: currentRow.quantity * incomingRow.rate,
      };
    }

    if (quantityChanged) return incomingRow;

    return currentRow;
  };

  useEffect(() => {
    setState((prev) => {
      return buildPayTable(
        initialRows.map((row, index) => syncRow(row, prev.rows[index])),
      );
    });
  }, [initialRows]);

  // Sync with initialRows, preserving user edits
  /*useEffect(() => {
    setState((prevState) => {
      const newRows = initialRows.map((incomingRow, index) => {
        const currentRow = prevState.rows[index];

        if (!currentRow) {
          return incomingRow;
        }

        // Rate changed → preserve user's quantity
        if (incomingRow.rate !== currentRow.rate) {
          return {
            ...incomingRow,
            quantity: currentRow.quantity,
            total: currentRow.quantity * incomingRow.rate,
          };
        }

        if (incomingRow.quantity !== currentRow.quantity) {
          return incomingRow;
        }

        // No changes → keep current
        return currentRow;
      });

      return buildPayTable(newRows);
    });
  }, [initialRows]);*/

  // Update single row (for user quantity changes)
  const updateRow = (index: number, updatedRow: PayRowVM) => {
    /*setState((prev) => {
      const rows = prev.rows.map((row, i) => (i === index ? updatedRow : row));
      return buildPayTable(rows);
    });*/
    setState((prev) => {
      return buildPayTable(
        prev.rows.map((row, i) => (i === index ? updatedRow : row)),
      );
    });
  };

  return {
    rows: state.rows,
    total: state.total,
    updateRow,
  };
};

/*export const usePayTableVM = (initialRows: PayRowVM[] = []) => {
  const [state, setState] = useState<PayTableVM>(() =>
    buildPayTable(initialRows),
  );

  useEffect(() => {
    setState((prev) => {
      const nextRows = initialRows.map((next) => {
        const current = prev.rows.find((r) => r.label === next.label);

        const quantity = current ? current.quantity : next.quantity;

        return {
          ...next,
          quantity,
          total: quantity * next.rate,
        };
      });

      return buildPayTable(nextRows);
    });
  }, [initialRows]);

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
    state,
    updateRowQuantity,
  };
};*/

import { useEffect, useMemo, useState } from "react";
import { buildPayTable } from "../helpers";
import { PayRowVM, PayTableVM, SalarySectionConfig } from "../vm";

type UsePayTableVMParams = {
  section: SalarySectionConfig;
};

export const usePayTableVM = ({ section }: UsePayTableVMParams) => {
  // Build rows from domain (recalculates when inputs change)
  const initialRows: PayRowVM[] = useMemo(() => {
    switch (section.type) {
      case "base":
      case "extra":
        return section.buildRows(section.payVM, section.baseRate);
      case "allowance":
        return section.buildRows(
          section.payVM,
          section.allowanceRate,
          section.rateDiem,
        );
    }
  }, [section]);

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

  // Update single row (for user quantity changes)
  const updateRow = (index: number, updatedRow: PayRowVM) => {
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

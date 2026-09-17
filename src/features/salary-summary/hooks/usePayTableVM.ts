import { useCallback, useMemo, useState } from "react";
import { buildPayTable } from "../helpers";
import { PayRowVM, SalarySectionConfig } from "../vm";

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

  const [quantityOverrides, setQuantityOverrides] = useState<
    Record<string, number>
  >({});

  const table = useMemo(() => {
    const rows = initialRows.map((row, index) => {
      const key = `${section.id}:${index}`;
      const quantity = quantityOverrides[key] ?? row.quantity;

      return quantity === row.quantity
        ? row
        : { ...row, quantity, total: quantity * row.rate };
    });

    return buildPayTable(rows);
  }, [initialRows, quantityOverrides, section.id]);

  // Update single row (for user quantity changes)
  const updateRow = useCallback(
    (index: number, updatedRow: PayRowVM) => {
      const key = `${section.id}:${index}`;

      setQuantityOverrides((previous) => {
        if (initialRows[index]?.quantity === updatedRow.quantity) {
          if (!(key in previous)) return previous;

          const next = { ...previous };
          delete next[key];
          return next;
        }

        if (previous[key] === updatedRow.quantity) return previous;
        return { ...previous, [key]: updatedRow.quantity };
      });
    },
    [initialRows, section.id],
  );

  return {
    rows: table.rows,
    total: table.total,
    updateRow,
  };
};

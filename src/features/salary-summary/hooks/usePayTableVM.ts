import { useCallback, useMemo } from "react";
import { applyQuantityOverrides, buildPayTable } from "../helpers";
import type {
  PayRowVM,
  SalaryQuantityOverrides,
  SalarySectionConfig,
} from "../vm";

type UsePayTableVMParams = {
  section: SalarySectionConfig;
  quantityOverrides: SalaryQuantityOverrides;
  onQuantityOverrideChange: (key: string, value?: number) => void;
};

const getOverrideKey = (sectionId: string, row: PayRowVM) =>
  `${sectionId}:${row.id}`;

export const usePayTableVM = ({
  section,
  quantityOverrides,
  onQuantityOverrideChange,
}: UsePayTableVMParams) => {
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

  const table = useMemo(() => {
    const rows = applyQuantityOverrides(
      initialRows,
      section.id,
      quantityOverrides,
    );

    return buildPayTable(rows);
  }, [initialRows, quantityOverrides, section.id]);

  // Update single row (for user quantity changes)
  const updateRow = useCallback(
    (index: number, updatedRow: PayRowVM) => {
      const key = getOverrideKey(section.id, initialRows[index]);
      const nextValue =
        initialRows[index]?.quantity === updatedRow.quantity
          ? undefined
          : updatedRow.quantity;

      onQuantityOverrideChange(key, nextValue);
    },
    [initialRows, onQuantityOverrideChange, section.id],
  );

  return {
    rows: table.rows,
    total: table.total,
    updateRow,
  };
};

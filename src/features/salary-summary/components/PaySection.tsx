import { useEffect, useState } from "react";

import { TableCell, TableRow, TextField } from "@mui/material";
import { formatValue } from "@/utils";
import { PayRowVM } from "@/features/salary-summary";

type PaySectionProps = {
  rows: PayRowVM[];
  summaryLabel: string;
  editMode: boolean;
  onChange: (index: number, quantity: number) => void;
  backgroundColor?: string;
  showOnlyNonZero?: boolean;
};

export const PaySection = ({
  rows,
  summaryLabel,
  editMode,
  onChange,
  backgroundColor = "#f0f0f0",
  showOnlyNonZero = false,
}: PaySectionProps) => {
  const [quantities, setQuantities] = useState<string[]>(
    rows.map((r) => r.quantity.toString()),
  );

  const total = rows.reduce((sum, r) => sum + r.total, 0);

  useEffect(() => {
    if (!editMode) return;
    setQuantities(rows.map((r) => r.quantity.toString()));
  }, [rows, editMode]);

  const updateQuantity = (index: number, value: string) => {
    setQuantities((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleBlur = (index: number) => {
    const parsed = Number(quantities[index]);
    if (isNaN(parsed) || parsed < 0) {
      // Revert to original value if invalid
      setQuantities((prev) => {
        const next = [...prev];
        next[index] = rows[index].quantity.toString();
        return next;
      });
      return;
    }
    onChange(index, parsed);
  };

  const visibleRows = showOnlyNonZero
    ? rows.filter((row) => row.quantity > 0 || editMode)
    : rows;

  return (
    <>
      {visibleRows.map((row, index) => (
        <TableRow key={index}>
          <TableCell align="center">{row.label}</TableCell>
          <TableCell align="center">
            {editMode ? (
              <TextField
                type="text"
                inputMode="numeric"
                variant="standard"
                size="small"
                value={quantities[index] ?? ""}
                onChange={(e) => updateQuantity(index, e.target.value)}
                onBlur={() => handleBlur(index)}
              />
            ) : (
              formatValue(row.quantity)
            )}
          </TableCell>
          <TableCell align="center">₪{formatValue(row.rate)}</TableCell>
          <TableCell align="center">
            {row.total > 0 ? `₪${formatValue(row.total)}` : ""}
          </TableCell>
          <TableCell />
        </TableRow>
      ))}

      <TableRow sx={{ backgroundColor }}>
        <TableCell colSpan={3} />
        <TableCell align="center">{summaryLabel}</TableCell>
        <TableCell align="center">
          {total > 0 ? `₪${formatValue(total)}` : ""}
        </TableCell>
      </TableRow>
    </>
  );
};

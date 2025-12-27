import { useEffect, useState } from "react";

import { TableCell, TableRow, TextField } from "@mui/material";
import { formatValue } from "@/utils";
import { PayRowVM } from "./salarySummary.vm";

type PaySectionProps = {
  rows: PayRowVM[];
  summaryLabel: string;
  editMode: boolean;
  onChange: (index: number, quantity: number) => void;
  backgroundColor?: string;
};

export const PaySection = ({
  rows,
  summaryLabel,
  editMode,
  onChange,
  backgroundColor = "#f0f0f0",
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

  return (
    <>
      {rows.map((row, index) => (
        <TableRow key={index}>
          <TableCell>{row.label}</TableCell>
          <TableCell>
            {editMode ? (
              <TextField
                type="text"
                inputMode="numeric"
                variant="standard"
                size="small"
                value={quantities[index] ?? ""}
                onChange={(e) => updateQuantity(index, e.target.value)}
                onBlur={() => {
                  const parsed = Number(quantities[index]);
                  if (isNaN(parsed) || parsed < 0) return;
                  onChange(index, parsed);
                }}
              />
            ) : (
              formatValue(row.quantity)
            )}
          </TableCell>
          <TableCell>₪{formatValue(row.rate)}</TableCell>
          <TableCell>
            {row.total > 0 ? `₪${formatValue(row.total)}` : ""}
          </TableCell>
          <TableCell />
        </TableRow>
      ))}

      <TableRow sx={{ backgroundColor }}>
        <TableCell colSpan={3} />
        <TableCell>{summaryLabel}</TableCell>
        <TableCell>{total > 0 ? `₪${formatValue(total)}` : ""}</TableCell>
      </TableRow>
    </>
  );
};

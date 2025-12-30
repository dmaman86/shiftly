import { useState, useEffect } from "react";
import { TableCell, TableRow, TextField, Typography } from "@mui/material";
import { formatValue } from "@/utils";
import { useDebounce } from "@/hooks";
import { PayRowVM } from "./salarySummary.vm";

type SalaryRowProps = {
  row: PayRowVM;
  editMode: boolean;
  onQuantityChange: (newQuantity: number) => void;
};

export const SalaryRow = ({
  row,
  editMode,
  onQuantityChange,
}: SalaryRowProps) => {
  const [inputValue, setInputValue] = useState(row.quantity.toString());

  const debouncedValue = useDebounce({ value: inputValue, delay: 500 });

  useEffect(() => {
    setInputValue(row.quantity.toString());
  }, [row.quantity]);

  useEffect(() => {
    if (!editMode) return;
    const parsed = parseFloat(debouncedValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== row.quantity) {
      onQuantityChange(parsed);
    }
  }, [debouncedValue, onQuantityChange, row.quantity, editMode]);

  return (
    <TableRow hover>
      <TableCell sx={{ py: 1 }}>{row.label}</TableCell>
      <TableCell align="center">
        {editMode ? (
          <TextField
            variant="standard"
            size="small"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            slotProps={{
              input: {
                style: { textAlign: "center" },
                inputMode: "decimal",
              },
            }}
            sx={{ width: 70 }}
          />
        ) : (
          <Typography variant="body2">{formatValue(row.quantity)}</Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" color="text.secondary">
          ₪{formatValue(row.rate)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" fontWeight={500}>
          {row.total > 0 ? `₪${formatValue(row.total)}` : "—"}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

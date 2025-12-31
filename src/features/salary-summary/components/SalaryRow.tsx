import { TableCell, TableRow, TextField, Typography } from "@mui/material";
import { formatValue } from "@/utils";
import { PayRowVM, useEditableQuantity } from "@/features/salary-summary";

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
  const { inputValue, onInputChange } = useEditableQuantity({
    value: row.quantity,
    enabled: editMode,
    onCommit: onQuantityChange,
  });

  return (
    <TableRow hover>
      <TableCell sx={{ py: 1 }}>{row.label}</TableCell>
      <TableCell align="center">
        {editMode ? (
          <TextField
            variant="standard"
            size="small"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
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

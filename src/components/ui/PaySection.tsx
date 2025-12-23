import { TableCell, TableRow, TextField } from "@mui/material";
import { PayRowVM } from "./PayRowVM";
import { formatValue } from "@/utils";

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
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <>
      {rows.map((row, index) => (
        <TableRow key={index}>
          <TableCell>{row.label}</TableCell>
          <TableCell>
            {editMode ? (
              <TextField
                type="number"
                variant="standard"
                size="small"
                value={row.quantity}
                onChange={(e) => {
                  const quantity = Number(e.target.value);
                  if (isNaN(quantity) || quantity < 0) return;
                  onChange(index, quantity);
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

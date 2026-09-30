import { Box, TableCell, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
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
      <TableCell sx={{ py: 1 }}>
        {row.label}
        {row.tooltip && (
          <Tooltip title={row.tooltip}>
            {/* Padding + negative margin extends the touch/click target well
                past the icon's visual bounds (info icons are otherwise far
                below the ~44px minimum recommended for touch) without
                affecting the row's layout. */}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                verticalAlign: "middle",
                p: 1,
                mt: -1,
                mr: -1,
                mb: -1,
                ml: -0.5,
              }}
            >
              <InfoIcon
                sx={{
                  fontSize: "0.9rem",
                  color: "text.disabled",
                }}
              />
            </Box>
          </Tooltip>
        )}
      </TableCell>
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

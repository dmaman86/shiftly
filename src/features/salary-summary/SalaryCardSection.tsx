import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";
import { formatValue } from "@/utils";
import { PayRowVM } from "./salarySummary.vm";
import { SalaryRow } from "./SalaryRow";

type SalaryCardSectionProps = {
  title: string;
  icon: React.ReactNode;
  rows: PayRowVM[];
  summaryLabel: string;
  onRowChange: (index: number, newQuantity: number) => void;
  color?: string;
};

export const SalaryCardSection = ({
  title,
  icon,
  rows,
  summaryLabel,
  onRowChange,
  color = "#1976d2",
}: SalaryCardSectionProps) => {
  const [editMode, setEditMode] = useState(false);
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <Card
      variant="outlined"
      sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}
    >
      <CardHeader
        avatar={icon}
        title={
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
        }
        action={
          <Tooltip title={editMode ? "סיים עריכה" : "ערוך כמויות"}>
            <IconButton
              onClick={() => setEditMode(!editMode)}
              size="small"
              color={editMode ? "primary" : "default"}
            >
              {editMode ? <DoneIcon /> : <EditIcon />}
            </IconButton>
          </Tooltip>
        }
        sx={{
          py: 1.5,
          backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.02),
        }}
      />
      <Divider />
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: (theme) =>
                alpha(theme.palette.text.primary, 0.01),
            }}
          >
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>סוג</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                כמות
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                ערך
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                סכום
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <SalaryRow
                key={row.label}
                row={row}
                editMode={editMode}
                onQuantityChange={(val) => onRowChange(index, val)}
              />
            ))}
            <TableRow sx={{ backgroundColor: alpha(color, 0.08) }}>
              <TableCell colSpan={2} />
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {summaryLabel}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold", color }}>
                ₪{formatValue(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

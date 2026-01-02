import { useEffect, useState } from "react";
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
import {
  SalaryRow,
  SalarySectionConfig,
  usePayTableVM,
} from "@/features/salary-summary";

type SalaryCardSectionProps = {
  section: SalarySectionConfig;
  onTotalChange?: (id: string, total: number) => void;
};

export const SalaryCardSection = ({
  section,
  onTotalChange,
}: SalaryCardSectionProps) => {
  const [editMode, setEditMode] = useState(false);

  const table = usePayTableVM({
    payVM: section.payVM,
    baseRate: section.baseRate,
    allowanceRate: section.allowanceRate,
    rateDiem: section.rateDiem,
    buildRows: section.buildRows,
  });

  useEffect(() => {
    onTotalChange?.(section.id, table.total);
  }, [table.total, onTotalChange, section.id]);

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const row = table.rows[index];

    table.updateRow(index, {
      ...row,
      quantity: newQuantity,
      total: newQuantity * row.rate,
    });
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}
    >
      <CardHeader
        avatar={section.icon}
        title={
          <Typography variant="subtitle1" fontWeight="bold">
            {section.title}
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
            {table.rows.map((row, index) => (
              <SalaryRow
                key={row.label}
                row={row}
                editMode={editMode}
                onQuantityChange={(val) => handleQuantityChange(index, val)}
              />
            ))}
            <TableRow sx={{ backgroundColor: alpha(section.color, 0.08) }}>
              <TableCell colSpan={2} />
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {section.summaryLabel}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", color: section.color }}
              >
                ₪{formatValue(table.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

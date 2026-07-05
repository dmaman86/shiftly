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
import { useTranslation } from "react-i18next";
import { formatValue } from "@/utils";
import { useGlobalState } from "@/hooks";
import { analyticsService } from "@/services";
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
  const { t } = useTranslation("work-table");
  const { month, year } = useGlobalState();
  const [editMode, setEditMode] = useState(false);

  const table = usePayTableVM({ section });

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const row = table.rows[index];
    const updatedRow = { ...row, quantity: newQuantity, total: newQuantity * row.rate };
    table.updateRow(index, updatedRow);

    if (onTotalChange) {
      const newTotal = table.rows.reduce(
        (sum, r, i) => sum + (i === index ? updatedRow.total : r.total),
        0,
      );
      onTotalChange(section.id, newTotal);
    }
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
          <Tooltip title={editMode ? t("salary_summary.edit_done") : t("salary_summary.edit_quantities")}>
            <IconButton
              onClick={() => {
                if (!editMode) {
                  analyticsService.track({
                    name: "salary_section_edit_started",
                    params: { section_id: section.id, month, year },
                  });
                }
                setEditMode(!editMode);
              }}
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
              <TableCell sx={{ fontWeight: "bold" }}>{t("salary_summary.table_col_type")}</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {t("salary_summary.table_col_quantity")}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {t("salary_summary.table_col_value")}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {t("salary_summary.table_col_total")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row, index) => (
              <SalaryRow
                key={`${row.label}-${month}-${year}`}
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

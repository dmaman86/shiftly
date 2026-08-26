import { Box, Card, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { CompactPayBreakdownVM } from "@/domain";
import { formatValue } from "@/utils";
import { StatTile } from "./StatTile";

type MonthSummaryCardProps = {
  breakdown: CompactPayBreakdownVM;
};

export const MonthSummaryCard = ({ breakdown }: MonthSummaryCardProps) => {
  const { t } = useTranslation("work-table");

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, borderTop: "3px solid", borderTopColor: "text.primary" }}
    >
      <Typography sx={{ px: 1.5, pt: 1.5, pb: 0.5 }} fontWeight="bold">
        {t("feature_name_salary_summary")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          p: 1.5,
          bgcolor: "action.hover",
        }}
      >
        <StatTile label={t("headers.actual_hours")} value={formatValue(breakdown.actualHours)} />
        <StatTile label={t("headers.total_hours")} value={formatValue(breakdown.totalHours)} />
        <StatTile label={t("headers.regular")} value={formatValue(breakdown.regularHours)} />
        <StatTile label={t("headers.extras")} value={formatValue(breakdown.extraHours)} />
        {breakdown.dailySalary !== undefined && (
          <Box sx={{ gridColumn: "span 2" }}>
            <StatTile
              label={t("table.total_gross_label")}
              value={
                breakdown.dailySalary > 0 ? `₪${formatValue(breakdown.dailySalary)}` : "—"
              }
              emphasize
            />
          </Box>
        )}
      </Box>
    </Card>
  );
};

import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { CompactPayBreakdownVM, PayBreakdownViewModel } from "@/domain";
import { formatValue } from "@/utils";
import { CollapsibleCard, StatTile } from "@/components";
import { DayCardDetails } from "../day/DayCardDetails";

type MonthSummaryCardProps = {
  breakdown: CompactPayBreakdownVM;
  fullBreakdown: PayBreakdownViewModel;
};

export const MonthSummaryCard = ({
  breakdown,
  fullBreakdown,
}: MonthSummaryCardProps) => {
  const { t } = useTranslation("work-table");
  const detailsId = "month-summary-details";

  return (
    <CollapsibleCard
      detailsId={detailsId}
      regionLabel={t("month_details.region_label")}
      expandedLabel={t("month_details.hide")}
      collapsedLabel={t("month_details.show")}
      headerSx={{ pr: 0.5 }}
      sx={{ borderRadius: 2, borderTop: "3px solid", borderTopColor: "text.primary" }}
      header={
        <Typography sx={{ px: 1.5, pt: 1.5, pb: 0.5 }} fontWeight="bold">
          {t("feature_name_salary_summary")}
        </Typography>
      }
      collapsibleContent={
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <DayCardDetails
            breakdown={fullBreakdown}
            showShabbatCreditUsed
            showGeneratedAlert={false}
          />
        </Box>
      }
    >
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
    </CollapsibleCard>
  );
};

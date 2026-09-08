import { useState } from "react";
import { Box, Card, Collapse, IconButton, Tooltip, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";

import { CompactPayBreakdownVM, PayBreakdownViewModel } from "@/domain";
import { formatValue } from "@/utils";
import { StatTile } from "./StatTile";
import { DayCardDetails } from "./DayCardDetails";

type MonthSummaryCardProps = {
  breakdown: CompactPayBreakdownVM;
  fullBreakdown: PayBreakdownViewModel;
};

export const MonthSummaryCard = ({
  breakdown,
  fullBreakdown,
}: MonthSummaryCardProps) => {
  const { t } = useTranslation("work-table");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = "month-summary-details";

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, borderTop: "3px solid", borderTopColor: "text.primary" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 0.5 }}>
        <Typography sx={{ px: 1.5, pt: 1.5, pb: 0.5 }} fontWeight="bold">
          {t("feature_name_salary_summary")}
        </Typography>
        <Tooltip title={detailsOpen ? t("month_details.hide") : t("month_details.show")}>
          <IconButton
            size="small"
            aria-label={detailsOpen ? t("month_details.hide") : t("month_details.show")}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
            sx={{
              transform: detailsOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </Box>
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
      <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
        <Box
          id={detailsId}
          role="region"
          aria-label={t("month_details.region_label")}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        >
          <DayCardDetails
            breakdown={fullBreakdown}
            showShabbatCreditUsed
            showGeneratedAlert={false}
          />
        </Box>
      </Collapse>
    </Card>
  );
};

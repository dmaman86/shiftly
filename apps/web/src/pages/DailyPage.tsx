import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Link as MuiLink,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  WorkTable,
  AuthControls,
  ConfigPanel,
  MonthlySalarySummary,
  Feedback,
  useMonthlyBreakdowns,
  useShabbatCreditAllocation,
  MonthlyContentBoundary,
} from "@/features";
import { useGlobalState, useWorkDays } from "@/hooks";
import { DomainContextType } from "@/app";
import { CalculationHelpLinks } from "@/features/calculation-rules/CalculationHelpLinks";
import { FeatureBoundary } from "@/layout";

export const DailyPage = ({ domain }: { domain: DomainContextType }) => {
  const { t } = useTranslation("work-table");
  const { workDays, isLoading: loading, error: queryError } = useWorkDays(domain);
  const error = queryError?.message;

  return (
    <Box component="section" sx={{ mt: 2 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h5" component="h1" fontWeight="bold">
                {t("page_title")}
              </Typography>
            }
            subheader={
              <Stack spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("page_subtitle")}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("nav_hint_monthly")}
                  </Typography>
                  <MuiLink
                    component={RouterLink}
                    to="../monthly"
                    variant="body2"
                  >
                    {t("nav_link_monthly")}
                  </MuiLink>
                </Stack>
                <CalculationHelpLinks source="daily" />
                <Box sx={{ pt: 1 }}>
                  <AuthControls />
                </Box>
              </Stack>
            }
            sx={{
              textAlign: "center",
            }}
          />
          <CardContent>
            <Stack spacing={3}>
              <ConfigPanel domain={domain} mode={"daily"} />

              <MonthlyContentBoundary loading={loading} minHeight={600}>
                {error ? <Alert severity="error">{error}</Alert> : (
                  <DailyMonthlyContent domain={domain} workDays={workDays} />
                )}
              </MonthlyContentBoundary>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

const DailyMonthlyContent = ({ domain, workDays }: {
  domain: DomainContextType;
  workDays: ReturnType<typeof useWorkDays>["workDays"];
}) => {
  const { t } = useTranslation("work-table");
  const { year, month, baseRate } = useGlobalState();
  const shabbatCreditAllocation = useShabbatCreditAllocation();
  const { monthBreakdown, monthFullBreakdown } = useMonthlyBreakdowns({
    monthPayMapCalculator: domain.payMap.monthPayMapCalculator,
    baseRate,
    shabbatCreditHours: shabbatCreditAllocation.usedHours,
  });
  return (
    <Stack spacing={3}>
      {workDays.length > 0 && (
        <FeatureBoundary
          featureName={t("feature_name_work_table")}
          errorContext="WorkTable"
          resetKeys={[year, month]}
        >
          <WorkTable
            domain={domain}
            workDays={workDays}
            shabbatCreditAllocation={shabbatCreditAllocation}
            monthBreakdown={monthBreakdown}
            monthFullBreakdown={monthFullBreakdown}
          />
        </FeatureBoundary>
      )}

      {baseRate > 0 && (
        <>
          <FeatureBoundary
            featureName={t("feature_name_salary_summary")}
            errorContext="MonthlySalarySummary"
            resetKeys={[year, month]}
          >
            <MonthlySalarySummary domain={domain} monthFullBreakdown={monthFullBreakdown} />
          </FeatureBoundary>
          <Feedback />
        </>
      )}
    </Stack>
  );
};

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
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
  useShabbatCreditAllocation,
} from "@/features";
import { useGlobalState, useWorkDays } from "@/hooks";
import { DomainContextType } from "@/app";
import { analyticsService } from "@/services";
import { FeatureBoundary } from "@/layout";

export const DailyPage = ({ domain }: { domain: DomainContextType }) => {
  const { t } = useTranslation("work-table");
  const { year, month, baseRate } = useGlobalState();

  const { workDays, isLoading: loading, error: queryError } = useWorkDays(domain);
  const shabbatCreditAllocation = useShabbatCreditAllocation();

  const error = queryError?.message;

  const hasData = workDays.length > 0;

  return (
    <Box component="section" sx={{ mt: 2 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h5" fontWeight="bold">
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
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("nav_hint_rules")}
                  </Typography>
                  <MuiLink
                    component={RouterLink}
                    to="../account-and-rules"
                    variant="body2"
                  >
                    {t("nav_link_rules")}
                  </MuiLink>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("nav_hint_example")}
                  </Typography>
                  <MuiLink
                    component={RouterLink}
                    to="../account-and-rules#interactive-example"
                    variant="body2"
                    onClick={() =>
                      analyticsService.track({
                        name: "calculation_example_link_clicked",
                        params: { source: "daily" },
                      })
                    }
                  >
                    {t("nav_link_example")}
                  </MuiLink>
                </Stack>
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

              {error && <Alert severity="error">{error}</Alert>}

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!loading && !error && hasData && (
                <FeatureBoundary
                  featureName={t("feature_name_work_table")}
                  errorContext="WorkTable"
                  resetKeys={[year, month]}
                >
                  <WorkTable
                    domain={domain}
                    workDays={workDays}
                    shabbatCreditAllocation={shabbatCreditAllocation}
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
                    <MonthlySalarySummary domain={domain} />
                  </FeatureBoundary>
                  <Feedback />
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

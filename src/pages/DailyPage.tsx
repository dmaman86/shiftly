import { useState } from "react";
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
  ConfigPanel,
  MonthlySalarySummary,
  Feedback,
} from "@/features";
import {
  useDeviceType,
  useFetch,
  useGlobalState,
  useWorkDays,
  useAsync,
} from "@/hooks";
import { ApiResponse, TableViewMode } from "@/domain";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/app";
import { hebcalService, analyticsService } from "@/services";
import { ErrorBoundary, FeatureErrorFallback } from "@/layout";

export const DailyPage = ({ domain }: { domain: DomainContextType }) => {
  const { t } = useTranslation("work-table");
  const { dateService } = domain.services;
  const { isMobile } = useDeviceType();

  const call = hebcalService();
  const { year, month, baseRate, reset } = useGlobalState();

  const { workDays, generate } = useWorkDays();

  const [error, setError] = useState<string | undefined>(undefined);

  const [viewMode, setViewMode] = useState<TableViewMode>(
    isMobile ? "compact" : "expanded",
  );

  const { loading, callEndPoint, cancelEndPoint } = useFetch();

  useAsync<ApiResponse<Record<string, string[]>>>(
    () => {
      const { startDate, endDate } = dateService.getDatesRange(year, month);
      return callEndPoint<Record<string, string[]>>(
        call.getData(startDate, endDate),
        buildEventMap,
      );
    },
    ({ data, error }) => {
      if (data) {
        // console.log(data);
        generate(year, month, data);
        reset();
        setError(undefined);
        return;
      }
      analyticsService.track({
        name: "exception",
        params: {
          description: error ?? "hebcal fetch failed",
          fatal: false,
          error_type: "hebcal_api_error",
        },
      });
      setError(error);
    },
    [year, month],
    cancelEndPoint,
  );

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
                    to="../calculation-rules"
                    variant="body2"
                  >
                    {t("nav_link_rules")}
                  </MuiLink>
                </Stack>
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
                <ErrorBoundary
                  fallback={(error, reset) => (
                    <FeatureErrorFallback
                      featureName={t("feature_name_work_table")}
                      error={error}
                      resetError={reset}
                    />
                  )}
                >
                  <WorkTable
                    domain={domain}
                    workDays={workDays}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                </ErrorBoundary>
              )}

              {baseRate > 0 && (
                <>
                  <ErrorBoundary
                    fallback={(error, reset) => (
                      <FeatureErrorFallback
                        featureName={t("feature_name_salary_summary")}
                        error={error}
                        resetError={reset}
                      />
                    )}
                  >
                    <MonthlySalarySummary domain={domain} />
                  </ErrorBoundary>
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

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DomainContextType } from "@/app";
import { ConfigPanel, MonthlySalarySummary, Feedback } from "@/features";
import { ErrorBoundary, FeatureErrorFallback } from "@/layout";

export const MonthlySummaryPage = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const { t } = useTranslation("pages");
  const { t: tWT } = useTranslation("work-table");

  return (
    <Box component="section" sx={{ mt: 2 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h5" fontWeight="bold">
                {t("monthly_summary_page.title")}
              </Typography>
            }
            subheader={
              <Stack spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("monthly_summary_page.subtitle")}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("monthly_summary_page.nav_hint_daily")}
                  </Typography>
                  <MuiLink
                    component={RouterLink}
                    to="../daily"
                    variant="body2"
                  >
                    {t("monthly_summary_page.nav_link_daily")}
                  </MuiLink>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("monthly_summary_page.nav_hint_rules")}
                  </Typography>
                  <MuiLink
                    component={RouterLink}
                    to="../calculation-rules"
                    variant="body2"
                  >
                    {t("monthly_summary_page.nav_link_rules")}
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
              <ConfigPanel domain={domain} mode={"monthly"} />

              <ErrorBoundary
                fallback={(error, reset) => (
                  <FeatureErrorFallback
                    featureName={tWT("feature_name_salary_summary")}
                    error={error}
                    resetError={reset}
                  />
                )}
              >
                <MonthlySalarySummary domain={domain} />
              </ErrorBoundary>
              <Feedback />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

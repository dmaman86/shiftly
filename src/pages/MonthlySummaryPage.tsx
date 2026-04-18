import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";
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

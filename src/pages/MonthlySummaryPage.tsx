import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";

import { DomainContextType } from "@/app";
import { ConfigPanel, MonthlySalarySummary, Feedback } from "@/features";
import { ErrorBoundary, FeatureErrorFallback } from "@/layout";

export const MonthlySummaryPage = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  return (
    <section className="mt-2">
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h5" fontWeight="bold">
                חישוב שכר חודשי
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
                    featureName="סיכום שכר חודשי"
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
    </section>
  );
};

import { DomainContextType } from "@/app";
import { ConfigPanel, MonthlySalarySummary, Feedback } from "@/features";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";

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

              <MonthlySalarySummary domain={domain} />
              <Feedback />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </section>
  );
};

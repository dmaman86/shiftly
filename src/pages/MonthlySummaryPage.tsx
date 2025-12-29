import { DomainContextType } from "@/app";
import { ConfigPanel, MonthlySalarySummary, SalaryFeedback } from "@/features";
import { Box, Stack, Typography } from "@mui/material";

export const MonthlySummaryPage = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  return (
    <section className="mt-2">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack spacing={3} sx={{ direction: "ltr" }}>
          <Box>
            <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
              חישוב שכר חודשי
            </Typography>
          </Box>
          <Box>
            <ConfigPanel domain={domain} mode={"monthly"} />
          </Box>

          <Box>
            <MonthlySalarySummary domain={domain} />
            <SalaryFeedback />
          </Box>
        </Stack>
      </Box>
    </section>
  );
};

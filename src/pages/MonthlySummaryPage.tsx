import { ConfigPanel, MonthlySalarySummary } from "@/components";
import { DomainContextType } from "@/context";
import { Box, Stack } from "@mui/material";

export const MonthlySummaryPage = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        mt: 4,
      }}
    >
      <Stack spacing={3} sx={{ direction: "ltr" }}>
        <Box>
          <ConfigPanel domain={domain} mode={"monthly"} />
        </Box>

        <Box>
          <MonthlySalarySummary domain={domain} />
        </Box>
      </Stack>
    </Box>
  );
};

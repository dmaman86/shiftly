import { Box, Typography, Stack } from "@mui/material";

interface SummaryHeaderProps {
  title: string;
  subtitle?: string;
}

export const SummaryHeader = ({ title, subtitle }: SummaryHeaderProps) => {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h5" fontWeight="bold">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

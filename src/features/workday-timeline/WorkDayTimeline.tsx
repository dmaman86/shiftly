import { Box, Typography } from "@mui/material";

type WorkDayTimelineProps = {
  title?: string;
  children: React.ReactNode;
};

export const WorkDayTimeline = ({ title, children }: WorkDayTimelineProps) => {
  return (
    <Box sx={{ width: "100%" }}>
      {title && (
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ mb: 0.5, display: "block" }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

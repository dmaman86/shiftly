import { Box } from "@mui/material";

type WorkDayTimelineProps = {
  children: React.ReactNode;
};

export const WorkDayTimeline = ({ children }: WorkDayTimelineProps) => {
  return (
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
  );
};

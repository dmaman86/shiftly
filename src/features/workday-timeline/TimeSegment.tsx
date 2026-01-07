import { Box, Typography } from "@mui/material";

type TimeSegmentProps = {
  from: string;
  to: string;
  label: string;
  flex: number;
  color: string;
  crossDay?: boolean;
};

export const TimeSegment = ({
  from,
  to,
  label,
  flex,
  color,
  crossDay = false,
}: TimeSegmentProps) => {
  return (
    <Box
      sx={{
        flex,
        backgroundColor: color,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        px: { xs: 0.5, sm: 1 },
        py: { xs: 0.5, sm: 0.75 },
        position: "relative",
        minWidth: { xs: "80px", sm: "auto" },
      }}
    >
      {/* Time range */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{
            fontSize: { xs: "0.65rem", sm: "0.75rem" },
            lineHeight: 1.2,
          }}
        >
          {from}
          {crossDay && <sup>*</sup>}
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{
            fontSize: { xs: "0.65rem", sm: "0.75rem" },
            lineHeight: 1.2,
            textAlign: "left",
          }}
        >
          {to}
          {crossDay && <sup>**</sup>}
        </Typography>
      </Box>

      {/* Percentage label */}
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            display: "block",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

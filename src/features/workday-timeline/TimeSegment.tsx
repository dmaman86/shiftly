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
        px: 1,
        py: 0.5,
        position: "relative",
      }}
    >
      {/* Time range */}
      <div className="row">
        <div className="col-6 d-flex align-items-start">
          <Typography variant="caption" fontWeight="bold">
            {from}
            {crossDay && <sup>*</sup>}
          </Typography>
        </div>
        <div className="col-6 d-flex align-items-end flex-column">
          <Typography variant="caption" fontWeight="bold">
            {to}
            {crossDay && <sup>**</sup>}
          </Typography>
        </div>
      </div>

      {/* Percentage label */}
      <div className="row">
        <div className="col text-center">
          <Typography
            variant="caption"
            fontWeight="bold"
            textAlign="center"
            sx={{ mt: 0.5 }}
          >
            {label}
          </Typography>
        </div>
      </div>
    </Box>
  );
};

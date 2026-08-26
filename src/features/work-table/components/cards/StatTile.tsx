import { Box, Typography } from "@mui/material";

type StatTileProps = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export const StatTile = ({ label, value, emphasize = false }: StatTileProps) => (
  <Box sx={{ textAlign: "center" }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block", fontSize: "0.7rem" }}
    >
      {label}
    </Typography>
    <Typography
      variant={emphasize ? "h6" : "body2"}
      fontWeight={700}
      color={emphasize ? "primary.main" : "text.primary"}
    >
      {value}
    </Typography>
  </Box>
);

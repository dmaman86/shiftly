import { Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type TimelineNoteProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "info" | "warning" | "tip";
};

export const TimelineNote = ({
  children,
  icon,
  variant = "info",
}: TimelineNoteProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          bgcolor: "rgba(255, 152, 0, 0.08)",
          borderColor: "warning.main",
          iconColor: "warning.main",
        };
      case "tip":
        return {
          bgcolor: "rgba(76, 175, 80, 0.08)",
          borderColor: "success.main",
          iconColor: "success.main",
        };
      default:
        return {
          bgcolor: "rgba(33, 150, 243, 0.08)",
          borderColor: "info.main",
          iconColor: "info.main",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        mt: 2,
        p: 1.5,
        borderRadius: 1,
        bgcolor: styles.bgcolor,
        borderRight: 3,
        borderColor: styles.borderColor,
      }}
    >
      <Box
        sx={{
          color: styles.iconColor,
          display: "flex",
          alignItems: "flex-start",
          pt: 0.2,
        }}
      >
        {icon || <InfoOutlinedIcon fontSize="small" />}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="caption"
          component="div"
          sx={{
            lineHeight: 1.7,
            "& > *:not(:last-child)": {
              mb: 0.5,
            },
          }}
        >
          {children}
        </Typography>
      </Box>
    </Box>
  );
};

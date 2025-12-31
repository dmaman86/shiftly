import { useMediaQuery, useTheme } from "@mui/material";

export const useDeviceType = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return {
    isMobile,
    isDesktop: !isMobile,
  };
};

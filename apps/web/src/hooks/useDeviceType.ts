import { type Breakpoint, useMediaQuery, useTheme } from "@mui/material";

// Components choose their own cutoff: the header needs more room than the work
// table, so it collapses below `md` while the table switches below `sm`.
export const useDeviceType = (mobileBelow: Breakpoint = "sm") => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(mobileBelow));

  return {
    isMobile,
    isDesktop: !isMobile,
  };
};

import { AppBar } from "@mui/material";
import { useDeviceType } from "@/hooks";
import { ViewSwitcherDesktop } from "./ViewSwitcherDesktop";
import { ViewSwitcherMobile } from "./ViewSwitcherMobile";

export const ViewSwitcher = () => {
  // The full link row needs more width than `sm` provides, especially in Hebrew.
  const { isMobile } = useDeviceType("md");

  return (
    <AppBar position="static" color="default" elevation={1}>
      {isMobile ? <ViewSwitcherMobile /> : <ViewSwitcherDesktop />}
    </AppBar>
  );
};

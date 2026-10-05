import { Box, Collapse, IconButton, Toolbar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks";
import { AuthControls } from "@/features/auth";
import { LanguageToggle, NavBrand, NavItem } from "./NavParts";
import { navMenuIntroStorage } from "../helpers";
import { useNavigation } from "../hooks";

export const ViewSwitcherMobile = () => {
  const { t } = useTranslation("common");
  const { direction } = useDirection();
  const { homePath, items, toggleLang } = useNavigation();
  // First-time visitors see the menu expanded so they discover the other pages.
  const [open, setOpen] = useState(() => !navMenuIntroStorage.hasSeen());
  const menuId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    navMenuIntroStorage.markSeen();
  }, []);

  return (
    <>
      <Toolbar dir={direction}>
        <NavBrand to={homePath} onClick={close} />
        <AuthControls display="account" />
        <LanguageToggle
          onToggle={() => {
            close();
            toggleLang();
          }}
        />
        <IconButton
          aria-label={t(open ? "nav.close_menu" : "nav.open_menu")}
          aria-expanded={open}
          // The menu unmounts when collapsed, so only reference it while it exists.
          aria-controls={open ? menuId : undefined}
          edge="end"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          component="nav"
          id={menuId}
          aria-label={t("nav.main_navigation")}
          dir={direction}
          sx={{ display: "flex", flexDirection: "column", p: 1, gap: 1 }}
        >
          {items.map((item) => (
            <NavItem key={item.to} to={item.to} onClick={close}>{item.label}</NavItem>
          ))}
        </Box>
      </Collapse>
    </>
  );
};

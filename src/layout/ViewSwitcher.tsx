import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
  Collapse,
  //Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
// import TranslateIcon from "@mui/icons-material/Translate";
import { useState } from "react";
import { NavLink, NavLinkRenderProps } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks";

const navButtonBaseStyle = {
  color: "text.secondary",
  borderRadius: 0,
  "&.nav-active": {
    color: "primary.main",
    fontWeight: 600,
    borderBottom: "2px solid",
    borderColor: "primary.main",
  },
};

const NavItem = ({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }: NavLinkRenderProps) =>
      isActive ? "nav-active" : ""
    }
  >
    <Button fullWidth sx={navButtonBaseStyle}>
      {children}
    </Button>
  </NavLink>
);

export const ViewSwitcher = () => {
  const { t } = useTranslation();
  const { direction /*toggleDirection*/ } = useDirection();
  const [open, setOpen] = useState(false);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar dir={direction}>
        <Typography
          variant="h6"
          component={NavLink}
          to="/daily"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {t("nav.app_title")}
        </Typography>

        {/* Desktop nav */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>
          <NavItem to="/daily">{t("nav.daily")}</NavItem>
          <NavItem to="/monthly">{t("nav.monthly")}</NavItem>
          <NavItem to="/calculation-rules">
            {t("nav.calculation_rules")}
          </NavItem>
        </Box>

        {/* Direction toggle */}
        {/*<Tooltip title={direction === "rtl" ? "Switch to English" : "עבור לעברית"}>
          <IconButton onClick={toggleDirection} size="small" sx={{ mx: 1 }}>
            <TranslateIcon fontSize="small" />
          </IconButton>
        </Tooltip>*/}

        {/* Mobile menu toggle */}
        <IconButton
          aria-label="Open navigation menu"
          edge="end"
          onClick={() => setOpen((prev) => !prev)}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      {/* Mobile collapse */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          dir={direction}
          sx={{
            display: "flex",
            flexDirection: "column",
            p: 1,
            gap: 1,
          }}
        >
          <NavItem to="/daily" onClick={() => setOpen(false)}>
            {t("nav.daily")}
          </NavItem>
          <NavItem to="/monthly" onClick={() => setOpen(false)}>
            {t("nav.monthly")}
          </NavItem>
          <NavItem to="/calculation-rules" onClick={() => setOpen(false)}>
            {t("nav.calculation_rules")}
          </NavItem>
        </Box>
      </Collapse>
    </AppBar>
  );
};

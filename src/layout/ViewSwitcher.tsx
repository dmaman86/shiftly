import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
  Collapse,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import TranslateIcon from "@mui/icons-material/Translate";
import { useState } from "react";
import {
  NavLink,
  NavLinkRenderProps,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, useDirection } from "@/hooks";
import { analyticsService } from "@/services";
import { AuthControls } from "@/features/auth";

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
  const { direction } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  /* v8 ignore next */
  const lang = location.pathname.split("/")[1] || "he";
  const [open, setOpen] = useState(false);
  const accountAndRulesPath = `/${lang}/account-and-rules${user ? "#account-profile" : ""}`;

  const toggleLang = () => {
    const nextLang = lang === "he" ? "en" : "he";
    navigate(
      location.pathname.replace(`/${lang}/`, `/${nextLang}/`) + location.search,
    );
    analyticsService.track({
      name: "language_toggled",
      params: { lang: nextLang },
    });
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar dir={direction}>
        <Typography
          variant="h6"
          component={NavLink}
          to={`/${lang}/daily`}
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
          <NavItem to={`/${lang}/daily`}>{t("nav.daily")}</NavItem>
          <NavItem to={`/${lang}/monthly`}>{t("nav.monthly")}</NavItem>
          <NavItem to={accountAndRulesPath}>
            {t("nav.account_and_rules")}
          </NavItem>
        </Box>

        <AuthControls display="account" />

        {/* Language toggle */}
        <Tooltip
          title={direction === "rtl" ? "Switch to English" : "עבור לעברית"}
        >
          <IconButton
            onClick={toggleLang}
            size="small"
            sx={{ mx: 1 }}
            aria-label={
              direction === "rtl" ? "Switch to English" : "עבור לעברית"
            }
          >
            <TranslateIcon fontSize="small" />
          </IconButton>
        </Tooltip>

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
          <NavItem to={`/${lang}/daily`} onClick={() => setOpen(false)}>
            {t("nav.daily")}
          </NavItem>
          <NavItem to={`/${lang}/monthly`} onClick={() => setOpen(false)}>
            {t("nav.monthly")}
          </NavItem>
          <NavItem
            to={accountAndRulesPath}
            onClick={() => setOpen(false)}
          >
            {t("nav.account_and_rules")}
          </NavItem>
        </Box>
      </Collapse>
    </AppBar>
  );
};

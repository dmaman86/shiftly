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
  "&[aria-current='page']": {
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
  <Button
    component={NavLink}
    fullWidth
    sx={navButtonBaseStyle}
    to={to}
    onClick={onClick}
  >
    {children}
  </Button>
);

export const ViewSwitcher = () => {
  const { t } = useTranslation("common");
  const { direction } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, initializationError } = useAuth();
  /* v8 ignore next */
  const lang = location.pathname.split("/")[1] || "he";
  const [open, setOpen] = useState(false);
  const calculationRulesPath = `/${lang}/calculation-rules`;
  const showProfile = !!user && !isLoading && !initializationError;

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
          <NavItem to={calculationRulesPath}>
            {t("nav.calculation_rules")}
          </NavItem>
          {showProfile && <NavItem to={`/${lang}/profile`}>{t("nav.profile")}</NavItem>}
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
            to={calculationRulesPath}
            onClick={() => setOpen(false)}
          >
            {t("nav.calculation_rules")}
          </NavItem>
          {showProfile && <NavItem to={`/${lang}/profile`} onClick={() => setOpen(false)}>{t("nav.profile")}</NavItem>}
        </Box>
      </Collapse>
    </AppBar>
  );
};

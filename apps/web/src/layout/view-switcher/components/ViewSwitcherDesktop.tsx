import { Box, Toolbar } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks";
import { AuthControls } from "@/features/auth";
import { LanguageToggle, NavBrand, NavItem } from "./NavParts";
import { useNavigation } from "../hooks";

export const ViewSwitcherDesktop = () => {
  const { t } = useTranslation("common");
  const { direction } = useDirection();
  const { homePath, items, toggleLang } = useNavigation();

  return (
    <Toolbar dir={direction}>
      <NavBrand to={homePath} />

      <Box
        component="nav"
        aria-label={t("nav.main_navigation")}
        sx={{ display: "flex", gap: 2 }}
      >
        {items.map((item) => (
          <NavItem key={item.to} to={item.to}>
            {item.label}
          </NavItem>
        ))}
      </Box>

      <AuthControls display="account" />
      <LanguageToggle onToggle={toggleLang} />
    </Toolbar>
  );
};

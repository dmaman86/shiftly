import { Button, IconButton, Tooltip, Typography } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks";

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

export const NavItem = ({
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

export const NavBrand = ({
  to,
  onClick,
}: {
  to: string;
  onClick?: () => void;
}) => {
  const { t } = useTranslation("common");

  return (
    <Typography
      variant="h6"
      component={NavLink}
      to={to}
      onClick={onClick}
      sx={{
        flexGrow: 1,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {t("nav.app_title")}
    </Typography>
  );
};

// Labels stay in the target language on purpose: they must be readable by
// someone who does not understand the current one.
export const LanguageToggle = ({ onToggle }: { onToggle: () => void }) => {
  const { direction } = useDirection();
  const label = direction === "rtl" ? "Switch to English" : "עבור לעברית";

  return (
    <Tooltip title={label}>
      <IconButton
        onClick={onToggle}
        size="small"
        sx={{ mx: 1 }}
        aria-label={label}
      >
        <TranslateIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

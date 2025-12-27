import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import { NavLink, NavLinkRenderProps } from "react-router-dom";

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
  const [open, setOpen] = useState(false);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar dir="rtl">
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
          Shiftly – ניהול שעות עבודה ושכר
        </Typography>

        {/* Mobile toggle */}
        <IconButton
          aria-label="Open navigation menu"
          edge="end"
          onClick={() => setOpen((prev) => !prev)}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Desktop nav */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>
          <NavItem to="/daily">חישוב יומי</NavItem>
          <NavItem to="/monthly">חישוב חודשי</NavItem>
        </Box>
      </Toolbar>

      {/* Mobile collapse */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          dir="rtl"
          sx={{
            display: "flex",
            flexDirection: "column",
            p: 1,
            gap: 1,
          }}
        >
          <NavItem to="/daily" onClick={() => setOpen(false)}>
            חישוב יומי
          </NavItem>
          <NavItem to="/monthly" onClick={() => setOpen(false)}>
            חישוב חודשי
          </NavItem>
        </Box>
      </Collapse>
    </AppBar>
  );
};

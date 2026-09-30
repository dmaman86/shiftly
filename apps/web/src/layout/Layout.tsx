import { Footer, ViewSwitcher } from "@/layout";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box component="a" href="#main-content" sx={{
        position: "absolute", insetInlineStart: 8, top: 8, zIndex: 1500,
        p: 1, bgcolor: "background.paper", color: "text.primary",
        transform: "translateY(-200%)",
        "&:focus": { transform: "translateY(0)" },
      }}>
        {t("nav.skip_to_content")}
      </Box>
      <header>
        <ViewSwitcher />
      </header>
      <Box component="main" id="main-content" tabIndex={-1} sx={{ flex: 1 }}>
        {children}
      </Box>
      <Box component="footer" sx={{ mt: 2 }}>
        <Footer />
      </Box>
    </Box>
  );
};

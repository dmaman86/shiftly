import { CookieBanner, Footer, ViewSwitcher } from "@/layout";
import { Box } from "@mui/material";

import { useCookieConsent } from "@/hooks";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { consent, accept, reject } = useCookieConsent();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header>
        <ViewSwitcher />
      </header>
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      <Box component="footer" sx={{ mt: 2 }}>
        <Footer />
        {consent === null && (
          <CookieBanner onAccept={accept} onReject={reject} />
        )}
      </Box>
    </Box>
  );
};

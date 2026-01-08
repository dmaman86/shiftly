import { Footer, ViewSwitcher } from "@/layout";
import { Box } from "@mui/material";

export const Layout = ({ children }: { children: React.ReactNode }) => {
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
      </Box>
    </Box>
  );
};

import { Box, CircularProgress } from "@mui/material";

import { AppContent } from "@/components";
import { useDomain } from "./context";

export const App = () => {
  const domain = useDomain();

  if(!domain) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return <AppContent domain={domain} />;
};

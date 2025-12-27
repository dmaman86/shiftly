import { Provider } from "react-redux";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { store } from "@/redux/store";
import { DomainProvider } from "@/app/providers/DomainProvider";

import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { createTheme } from "@mui/material/styles";

const rtlCache = createCache({
  key: "mui-rtl",
  stylisPlugins: [rtlPlugin],
});

const theme = createTheme({
  direction: "rtl",
});

type AppProvidersProps = {
  children: React.ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <Provider store={store}>
      <DomainProvider>
        <CacheProvider value={rtlCache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              {children}
            </LocalizationProvider>
          </ThemeProvider>
        </CacheProvider>
      </DomainProvider>
    </Provider>
  );
};

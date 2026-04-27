import { useMemo, useEffect, useState } from "react";
import { Provider } from "react-redux";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { store } from "@/redux/store";
import { DomainProvider, AppSnackbarProvider } from "@/app/providers";

import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { createTheme } from "@mui/material/styles";

import { DirectionContext, type Direction } from "./direction/directionContext";

const getInitialDirection = (): Direction => {
  const lang = window.location.pathname.split("/")[1];
  return lang === "en" ? "ltr" : "rtl";
};

const ltrCache = createCache({ key: "mui-ltr" });
const rtlCache = createCache({ key: "mui-rtl", stylisPlugins: [rtlPlugin] });

type AppProvidersProps = { children: React.ReactNode };

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [direction, setDirection] = useState<Direction>(getInitialDirection);

  const theme = useMemo(() => createTheme({ direction }), [direction]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = direction === "rtl" ? "he" : "en";
  }, [direction]);

  return (
    <DirectionContext.Provider value={{ direction, setDirection }}>
      <Provider store={store}>
        <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
          <ThemeProvider theme={theme}>
            <AppSnackbarProvider>
              <DomainProvider>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <CssBaseline />
                  {children}
                </LocalizationProvider>
              </DomainProvider>
            </AppSnackbarProvider>
          </ThemeProvider>
        </CacheProvider>
      </Provider>
    </DirectionContext.Provider>
  );
};

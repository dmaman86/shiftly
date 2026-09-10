import { useMemo, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { AuthProvider, DomainProvider, AppSnackbarProvider } from "@/app/providers";

import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { createTheme } from "@mui/material/styles";

import { resolveLanguageFromPathname } from "@/i18n/language";
import { DirectionContext, type Direction } from "./direction/directionContext";

const getInitialDirection = (): Direction => {
  const language = resolveLanguageFromPathname(
    window.location.pathname,
    import.meta.env.BASE_URL,
  );

  return language === "en" ? "ltr" : "rtl";
};

const ltrCache = createCache({ key: "mui-ltr" });
const rtlCache = createCache({ key: "mui-rtl", stylisPlugins: [rtlPlugin] });

type AppProvidersProps = { children: React.ReactNode };

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [queryClient] = useState(() => new QueryClient());
  const [direction, setDirection] = useState<Direction>(getInitialDirection);

  const theme = useMemo(() => createTheme({ direction }), [direction]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = direction === "rtl" ? "he" : "en";
  }, [direction]);

  return (
    <DirectionContext.Provider value={{ direction, setDirection }}>
      <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
          <ThemeProvider theme={theme}>
            <AppSnackbarProvider>
              <AuthProvider>
                <DomainProvider>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <CssBaseline />
                    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
                  </LocalizationProvider>
                </DomainProvider>
              </AuthProvider>
            </AppSnackbarProvider>
          </ThemeProvider>
      </CacheProvider>
    </DirectionContext.Provider>
  );
};

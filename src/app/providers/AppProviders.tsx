import { useMemo, useEffect /*, useState*/ } from "react";
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

// i18n import unused while language toggle is disabled — kept for when toggle is re-enabled
// import i18n from "@/i18n";

import {
  DirectionContext,
  type Direction,
} from "./direction/directionContext";

// App is Hebrew/RTL only — direction toggle is disabled because the domain
// (Israeli labor law, Jewish holidays, ₪) has no practical English use case.
// To re-enable: restore toggleDirection, ltrCache, localStorage logic, and
// uncomment the TranslateIcon button in ViewSwitcher.tsx.
const FIXED_DIRECTION: Direction = "rtl";

// ltrCache was used when direction toggle was active.
// Kept here as reference for when toggle is re-enabled.
// const ltrCache = createCache({ key: "mui-ltr" });

const rtlCache = createCache({
  key: "mui-rtl",
  stylisPlugins: [rtlPlugin],
});

// getInitialDirection read from localStorage to persist user's language choice.
// Unused while toggle is disabled.
// const DIRECTION_KEY = "app-direction";
// const getInitialDirection = (): Direction =>
//   (localStorage.getItem(DIRECTION_KEY) as Direction) ?? "rtl";

type AppProvidersProps = {
  children: React.ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  // const [direction, setDirection] = useState<Direction>(getInitialDirection);
  // Replaced by FIXED_DIRECTION while toggle is disabled — restore when re-enabling
  const direction = FIXED_DIRECTION;

  const theme = useMemo(
    () => createTheme({ direction }),
    [direction],
  );

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = "he";
  }, [direction]);

  // toggleDirection switched between RTL/Hebrew and LTR/English, persisting
  // the choice in localStorage and calling i18n.changeLanguage().
  // Disabled — app is Hebrew-only. Uncomment alongside ltrCache and i18n import.
  // const toggleDirection = () => {
  //   const next: Direction = direction === "rtl" ? "ltr" : "rtl";
  //   setDirection(next);
  //   localStorage.setItem(DIRECTION_KEY, next);
  //   i18n.changeLanguage(next === "rtl" ? "he" : "en");
  // };

  return (
    <DirectionContext.Provider value={{ direction, toggleDirection: () => {} }}>
      <Provider store={store}>
        <CacheProvider value={rtlCache}>
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

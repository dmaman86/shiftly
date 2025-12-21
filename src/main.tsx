import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import "bootstrap/dist/css/bootstrap.min.css";

import { App } from "./App.tsx";
import store from "./redux/store";
import { DomainProvider } from "@/context";

const rtlCache = createCache({
  key: "mui-rtl",
  stylisPlugins: [rtlPlugin],
});

const theme = createTheme({ direction: "rtl" });

const divRoot = document.querySelector("#root");
const root = createRoot(divRoot!);

root.render(
  <StrictMode>
    <Provider store={store}>
      <DomainProvider>
        <CacheProvider value={rtlCache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              <App />
            </LocalizationProvider>
          </ThemeProvider>
        </CacheProvider>
      </DomainProvider>
    </Provider>
  </StrictMode>,
);

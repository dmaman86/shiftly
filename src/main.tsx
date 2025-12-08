import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { create } from "jss";
import rtl from "jss-rtl";
import { StylesProvider, jssPreset } from "@mui/styles";

import "bootstrap/dist/css/bootstrap.min.css";

import { App } from "./App.tsx";
import store from './redux/store';
import { DomainProvider } from "@/context";

const jss = create({ plugins: [...jssPreset().plugins, rtl()] });

const theme = createTheme({ direction: "rtl" });

const divRoot = document.querySelector("#root");
const root = createRoot(divRoot!);

root.render(
  <StrictMode>
    <Provider store={store}>
      <DomainProvider>
        <StylesProvider jss={jss}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </StylesProvider>
      </DomainProvider>
    </Provider>
  </StrictMode>,
);

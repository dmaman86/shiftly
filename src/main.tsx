import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";

import { App } from "./app";

const divRoot = document.querySelector("#root");
const root = createRoot(divRoot!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";
import { App } from "./app";

const divRoot = document.querySelector("#root");
const root = createRoot(divRoot!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

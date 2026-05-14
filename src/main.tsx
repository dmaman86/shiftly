import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { gtagService } from "@/services";
import "@/i18n";
import { App } from "./app";

gtagService.initConsentMode();

const divRoot = document.querySelector("#root");
const root = createRoot(divRoot!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

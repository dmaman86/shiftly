import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { Layout } from "@/layout";

export const App = () => {
  return (
    <BrowserRouter basename="/shiftly">
      <AppProviders>
        <Layout>
          <AppRoutes />
        </Layout>
      </AppProviders>
    </BrowserRouter>
  );
};

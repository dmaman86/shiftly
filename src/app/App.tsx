import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { ErrorBoundary, ErrorFallback, Layout } from "@/layout";

export const App = () => {
  return (
    <BrowserRouter basename="/shiftly">
      <ErrorBoundary
        fatal
        fallback={(_, reset) => <ErrorFallback resetError={reset} />}
        onError={(error, errorInfo) => {
          // Global error logging
          console.error("Global error caught: ", error);
          console.error("Error info: ", errorInfo);
        }}
      >
        <AppProviders>
          <Layout>
            <AppRoutes />
          </Layout>
        </AppProviders>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

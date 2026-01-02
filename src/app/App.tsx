import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { ErrorBoundary, ErrorFallback, Layout } from "@/layout";

export const App = () => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <ErrorFallback error={error} resetError={reset} />
      )}
      onError={(error, errorInfo) => {
        // Global error logging
        console.error("Global error caught: ", error);
        console.error("Error info: ", errorInfo);
      }}
    >
      <BrowserRouter basename="/shiftly">
        <AppProviders>
          <Layout>
            <AppRoutes />
          </Layout>
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

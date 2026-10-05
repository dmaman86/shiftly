import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { ErrorBoundary, ErrorFallback, Layout } from "@/layout";
import { GuestDraftImportProvider, MonthlyDataProvider } from "@/features";
import { OAuthCallbackHandler } from "@/features/auth";
import { guestDraftStorage } from "@/services/guestDraft";

// Read once per page load, before React renders: a draft is only offered
// right after the sign-in redirect. GuestDraftImportProvider clears storage
// once the sign-in outcome is known, so a plain reload never brings guest
// data back.
const pendingGuestDraft = guestDraftStorage.readPending();

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
          <OAuthCallbackHandler />
          <GuestDraftImportProvider initialDraft={pendingGuestDraft}>
            <MonthlyDataProvider>
              <Layout>
                <AppRoutes />
              </Layout>
            </MonthlyDataProvider>
          </GuestDraftImportProvider>
        </AppProviders>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

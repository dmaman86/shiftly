import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { useDomain, usePageTracking } from "@/hooks";
import { LanguageLayout } from "./LanguageLayout";

const DailyPage = lazy(() =>
  import("@/pages/DailyPage").then((m) => ({ default: m.DailyPage })),
);
const MonthlySummaryPage = lazy(() =>
  import("@/pages/MonthlySummaryPage").then((m) => ({
    default: m.MonthlySummaryPage,
  })),
);
const CalculationRulesPage = lazy(() =>
  import("@/pages/CalculationRulesPage").then((m) => ({
    default: m.CalculationRulesPage,
  })),
);

const RedirectToDaily = () => {
  const { lang } = useParams<{ lang: string }>();
  return <Navigate to={`/${lang}/daily`} replace />;
};

const PageLoader = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    <CircularProgress />
  </Box>
);

export const AppRoutes = () => {
  const domain = useDomain();
  usePageTracking();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/:lang" element={<LanguageLayout />}>
          <Route path="daily" element={<DailyPage domain={domain} />} />
          <Route
            path="monthly"
            element={<MonthlySummaryPage domain={domain} />}
          />
          <Route path="calculation-rules" element={<CalculationRulesPage />} />
          <Route path="*" element={<RedirectToDaily />} />
        </Route>
        <Route index element={<Navigate to="/he/daily" replace />} />
      </Routes>
    </Suspense>
  );
};

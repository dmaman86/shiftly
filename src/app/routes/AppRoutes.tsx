import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { useDomain } from "@/hooks";

// Lazy load pages for code splitting
const DailyPage = lazy(() =>
  import("@/pages").then((module) => ({ default: module.DailyPage })),
);
const MonthlySummaryPage = lazy(() =>
  import("@/pages").then((module) => ({ default: module.MonthlySummaryPage })),
);
const CalculationRulesPage = lazy(() =>
  import("@/pages").then((module) => ({
    default: module.CalculationRulesPage,
  })),
);

// Loading fallback component
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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/daily" element={<DailyPage domain={domain} />} />
        <Route
          path="/monthly"
          element={<MonthlySummaryPage domain={domain} />}
        />
        <Route path="/calculation-rules" element={<CalculationRulesPage />} />
        <Route path="/" element={<Navigate to="/daily" replace />} />
        <Route path="*" element={<Navigate to="/daily" replace />} />
      </Routes>
    </Suspense>
  );
};

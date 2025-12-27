import { Navigate, Route, Routes } from "react-router-dom";

import { DailyPage, MonthlySummaryPage } from "@/pages";
import { useDomain } from "@/hooks";

export const AppRoutes = () => {
  const domain = useDomain();

  return (
    <Routes>
      <Route path="/daily" element={<DailyPage domain={domain} />} />
      <Route path="/monthly" element={<MonthlySummaryPage domain={domain} />} />
      <Route path="/" element={<Navigate to="/daily" replace />} />
      <Route path="*" element={<Navigate to="/daily" replace />} />
    </Routes>
  );
};

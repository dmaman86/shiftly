import { Footer, ViewSwitcher } from "@/components";

import { DomainContextType } from "@/context";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DailyPage, MonthlySummaryPage } from "@/pages";

export const AppContent = ({ domain }: { domain: DomainContextType }) => {
  return (
    <BrowserRouter basename="/shiftly">
      <ViewSwitcher />
      <Routes>
        <Route path="/daily" element={<DailyPage domain={domain} />} />
        <Route
          path="/monthly"
          element={<MonthlySummaryPage domain={domain} />}
        />
        <Route path="/" element={<Navigate to="/daily" replace />} />
        <Route path="*" element={<Navigate to="/daily" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
};

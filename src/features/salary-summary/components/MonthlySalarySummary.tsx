import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Typography, Box, Stack, Card, CardContent } from "@mui/material";

import { DomainContextType } from "@/app";
import { analyticsService } from "@/services";
import { formatValue } from "@/utils";
import {
  SummaryHeader,
  SalaryCardSection,
  useMonthlySalarySummary,
} from "@/features/salary-summary";

import { useGlobalState } from "@/hooks";

export const MonthlySalarySummary = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const { t } = useTranslation("work-table");
  const sectionRef = useRef<HTMLDivElement>(null);

  const { globalBreakdown, baseRate, year, month } = useGlobalState();

  const {
    sections,
    updateSections,
    getMonthLabel,
    handleTotalChange,
    monthlyTotal,
  } = useMonthlySalarySummary({ domain });

  useEffect(() => {
    updateSections(globalBreakdown, year, month, baseRate);
  }, [globalBreakdown, year, month, baseRate, updateSections]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          analyticsService.track({
            name: "salary_summary_viewed",
            params: { month, year },
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [month, year]);

  return (
    <Card ref={sectionRef} sx={{ mb: 3 }}>
      <CardContent>
        <SummaryHeader
          title={t("salary_summary.title")}
          subtitle={t("salary_summary.subtitle", {
            monthLabel: getMonthLabel(year, month),
          })}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
          <Box sx={{ flex: 1, width: "100%" }}>
            {sections.map((section) => (
              <SalaryCardSection
                key={section.id}
                section={section}
                onTotalChange={handleTotalChange}
              />
            ))}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="h6" fontWeight="bold">
                  {t("salary_summary.total_label")}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                ₪{formatValue(monthlyTotal)}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

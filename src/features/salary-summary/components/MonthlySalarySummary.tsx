import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Typography, Box, Stack, Card, CardContent } from "@mui/material";

import { DomainContextType } from "@/app";
import { analyticsService } from "@/services";
import { formatValue } from "@/utils";
import {
  SummaryHeader,
  SalaryCardSection,
  SalaryQuantityOverrides,
  useMonthlySalarySummary,
} from "@/features/salary-summary";
import { useGlobalState } from "@/hooks";
import type { PayBreakdownViewModel } from "@/domain";

export const MonthlySalarySummary = ({
  domain,
  monthFullBreakdown,
}: {
  domain: DomainContextType;
  monthFullBreakdown: PayBreakdownViewModel;
}) => {
  const { t } = useTranslation("work-table");
  const sectionRef = useRef<HTMLDivElement>(null);

  const { baseRate, year, month } = useGlobalState();
  const scope = `${year}-${month}`;
  const [overrideState, setOverrideState] = useState<{
    scope: string;
    values: SalaryQuantityOverrides;
  }>({ scope, values: {} });
  const quantityOverrides =
    overrideState.scope === scope ? overrideState.values : {};

  const handleQuantityOverrideChange = (key: string, value?: number) => {
    setOverrideState((previous) => {
      const values = previous.scope === scope ? { ...previous.values } : {};

      if (value === undefined) {
        delete values[key];
      } else {
        values[key] = value;
      }

      return { scope, values };
    });
  };

  const { sections, getMonthLabel, monthlyTotal } = useMonthlySalarySummary({
    domain,
    monthFullBreakdown,
    year,
    month,
    baseRate,
    quantityOverrides,
  });

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
    <Card ref={sectionRef} sx={{ mb: 3 }} data-testid="monthly-salary-summary">
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
                key={`${section.id}-${year}-${month}`}
                section={section}
                quantityOverrides={quantityOverrides}
                onQuantityOverrideChange={handleQuantityOverrideChange}
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
              <Typography
                variant="h6"
                fontWeight="bold"
                data-testid="monthly-salary-total"
              >
                ₪{formatValue(monthlyTotal)}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

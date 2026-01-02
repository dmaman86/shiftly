import { useEffect } from "react";

import { Typography, Box, Stack, Card, CardContent } from "@mui/material";

import { DomainContextType } from "@/app";

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

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <SummaryHeader
          title="💰 סיכום שכר חודשי"
          subtitle={`ברוטו - לפי שעות - ${getMonthLabel(year, month)}`}
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
                  סה״כ לתשלום (ברוטו) משוער:
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

import { Typography, Box, Stack, Card, CardContent } from "@mui/material";
import { AccessTime, AddCircleOutline, Restaurant } from "@mui/icons-material";

import { DomainContextType } from "@/app";

import { formatValue } from "@/utils";
import {
  useMonthlySalarySummary,
  SummaryHeader,
  SalaryCardSection,
} from "@/features/salary-summary";

export const MonthlySalarySummary = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const {
    baseRows,
    extraRows,
    allowanceRows,
    updateBaseRow,
    updateExtraRow,
    updateAllowanceRow,
    monthlySalary,
    monthLabel,
  } = useMonthlySalarySummary(domain);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <SummaryHeader
          title="💰 סיכום שכר חודשי"
          subtitle={`ברוטו - לפי שעות - ${monthLabel}`}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
          <Box sx={{ flex: 1, width: "100%" }}>
            <SalaryCardSection
              title="שעות בסיס וזכויות"
              icon={<AccessTime color="primary" />}
              rows={baseRows}
              summaryLabel="סה״כ בסיס"
              onRowChange={updateBaseRow}
              color="#1976d2"
            />
            <SalaryCardSection
              title="תוספות ושעות נוספות"
              icon={<AddCircleOutline sx={{ color: "#ed6c02" }} />}
              rows={extraRows}
              summaryLabel="סה״כ תוספות"
              onRowChange={updateExtraRow}
              color="#ed6c02"
            />
            <SalaryCardSection
              title="אש״ל וכלכלה"
              icon={<Restaurant sx={{ color: "#2e7d32" }} />}
              rows={allowanceRows}
              summaryLabel="סה״כ נלוות"
              onRowChange={updateAllowanceRow}
              color="#2e7d32"
            />
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
                ₪{formatValue(monthlySalary)}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

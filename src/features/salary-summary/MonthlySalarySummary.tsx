import { useEffect, useMemo, useState } from "react";
import { Typography, Box, Stack, Card, CardContent } from "@mui/material";
import { AccessTime, AddCircleOutline, Restaurant } from "@mui/icons-material";
import { Segment } from "@/domain";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { monthToPayBreakdownVM } from "@/adapters";
import { PayRowVM } from "./salarySummary.vm";
import {
  buildAllowanceRows,
  buildPayRowsFromSegments,
} from "./salarySummary.mapper";
import { SalaryCardSection } from "./SalaryCardSection";
import { formatValue } from "@/utils";
import { SummaryHeader } from "./SummaryHeader";

export const MonthlySalarySummary = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const { globalBreakdown, baseRate, year, month } = useGlobalState();

  const [baseRows, setBaseRows] = useState<PayRowVM[]>([]);
  const [extraRows, setExtraRows] = useState<PayRowVM[]>([]);
  const [allowanceRows, setAllowanceRows] = useState<PayRowVM[]>([]);

  const monthResolver = domain.resolvers.monthResolver;

  const rateDiem = domain.resolvers.perDiemResolver.resolve({ year, month });

  const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
    year,
    month,
  });

  const payVM = useMemo(() => {
    return monthToPayBreakdownVM(globalBreakdown);
  }, [globalBreakdown]);

  useEffect(() => {
    const baseMap: Record<string, Segment> = {
      "100%": payVM.regular.hours100,
      "שבת תוספת 100%": payVM.extra100Shabbat,
      מחלה: payVM.hours100Sick,
      חופש: payVM.hours100Vacation,
    };

    const extraMap: Record<string, Segment> = {
      "תוספת לילה (50%)": payVM.extra.hours50,
      "150%": payVM.regular.hours150,
      "125%": payVM.regular.hours125,
      "שבת 150%": payVM.special.shabbat150,
      "שבת 200%": payVM.special.shabbat200,
      "תוספת ערב (20%)": payVM.extra.hours20,
    };

    setBaseRows(buildPayRowsFromSegments(baseRate, baseMap));
    setExtraRows(buildPayRowsFromSegments(baseRate, extraMap));

    setAllowanceRows(
      buildAllowanceRows({
        perDiem: { points: payVM.perDiemPoints, rate: payVM.perDiemAmount },
        mealAllowance: {
          small: { points: payVM.smallPoints, amount: payVM.smallAmount },
          large: { points: payVM.largePoints, amount: payVM.largeAmount },
        },
        rates: allowanceRate,
        rateDiem,
      }),
    );
  }, [payVM, baseRate, rateDiem, allowanceRate]);

  const calculateTotal = (rows: PayRowVM[]): number =>
    rows.reduce((sum, row) => sum + row.total, 0);

  const monthlySalary =
    calculateTotal(baseRows) +
    calculateTotal(extraRows) +
    calculateTotal(allowanceRows);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <SummaryHeader
          title="💰 סיכום שכר חודשי"
          subtitle={`ברוטו - לפי שעות - ${monthResolver.getMonthName(month - 1)} ${year}`}
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
              onRowChange={(index, quantity) =>
                setBaseRows((prev) =>
                  prev.map((r, i) =>
                    i === index
                      ? { ...r, quantity, total: quantity * r.rate }
                      : r,
                  ),
                )
              }
              color="#1976d2"
            />
            <SalaryCardSection
              title="תוספות ושעות נוספות"
              icon={<AddCircleOutline sx={{ color: "#ed6c02" }} />}
              rows={extraRows}
              summaryLabel="סה״כ תוספות"
              onRowChange={(index, quantity) =>
                setExtraRows((prev) =>
                  prev.map((r, i) =>
                    i === index
                      ? { ...r, quantity, total: quantity * r.rate }
                      : r,
                  ),
                )
              }
              color="#ed6c02"
            />
            <SalaryCardSection
              title="אש״ל וכלכלה"
              icon={<Restaurant sx={{ color: "#2e7d32" }} />}
              rows={allowanceRows}
              summaryLabel="סה״כ נלוות"
              onRowChange={(index, quantity) =>
                setAllowanceRows((prev) =>
                  prev.map((r, i) =>
                    i === index
                      ? { ...r, quantity, total: quantity * r.rate }
                      : r,
                  ),
                )
              }
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
                  סה״כ לתשלום (ברוטו):
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

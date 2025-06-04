import { useCallback, useEffect, useState } from "react";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import {
  WorkTable,
  ConfigPanel,
  Footer,
  MonthlySalarySummary,
} from "@/components";
import { useFetch } from "@/hooks";
import { service, DateUtils } from "@/utils";
import { ApiResponse, breakdownService, WorkDayPayMap } from "@/domain";
import { buildEventMap } from "@/adapters";

export const App = () => {
  const {
    initBreakdown,
    mergeBreakdowns,
    sumSegments,
    subtractSegments,
    updateBaseRate,
  } = breakdownService();

  const [values, setValues] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1-based
    baseRate: 0,
    standardHours: 6.67,
  });

  const [globalBreakdown, setGlobalBreakdown] = useState<WorkDayPayMap>(
    initBreakdown({}),
  );

  const [eventMap, setEventMap] = useState<Record<string, string[]> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { loading, callEndPoint } = useFetch();

  const handleChange = useCallback(
    (field: keyof typeof values, value: number) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const addToGlobalBreakdown = useCallback(
    (breakdown: WorkDayPayMap) => {
      setGlobalBreakdown((prev) =>
        mergeBreakdowns(prev, breakdown, sumSegments),
      );
    },
    [mergeBreakdowns, sumSegments],
  );

  const subtractFromGlobalBreakdown = useCallback(
    (breakdown: WorkDayPayMap) => {
      setGlobalBreakdown((prev) =>
        mergeBreakdowns(prev, breakdown, subtractSegments),
      );
    },
    [mergeBreakdowns, subtractSegments],
  );

  useEffect(() => {
    if (globalBreakdown.baseRate !== values.baseRate) {
      const newGlobalBreakdown = updateBaseRate(
        values.baseRate,
        globalBreakdown,
      );
      setGlobalBreakdown(newGlobalBreakdown);
    }
  }, [values.baseRate, globalBreakdown, updateBaseRate]);

  useEffect(() => {
    const loadEvents = async () => {
      const { startDate, endDate } = DateUtils.getDatesRange(
        values.year,
        values.month,
      );
      const { data, error }: ApiResponse<Record<string, string[]>> =
        await callEndPoint<Record<string, string[]>>(
          service.getData(startDate, endDate),
          buildEventMap,
        );
      setEventMap(data);
      setError(error);
      setGlobalBreakdown(initBreakdown({}));
    };

    loadEvents();
  }, [values.year, values.month]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Stack spacing={3} sx={{ direction: "rtl" }}>
        <Box>
          <Typography variant="h5" textAlign="center">
            סיכום שעות עבודה
          </Typography>
        </Box>

        <Box>
          <ConfigPanel values={values} onChange={handleChange} />
          {error && (
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          )}
        </Box>

        <Box>
          {!eventMap || loading ? (
            <CircularProgress sx={{ mt: 4 }} />
          ) : (
            <WorkTable
              values={values}
              eventMap={eventMap}
              globalBreakdown={globalBreakdown}
              addToGlobalBreakdown={addToGlobalBreakdown}
              subtractFromGlobalBreakdown={subtractFromGlobalBreakdown}
            />
          )}
        </Box>

        {globalBreakdown.baseRate > 0 && (
          <Box>
            <MonthlySalarySummary globalBreakdown={globalBreakdown} />
          </Box>
        )}
      </Stack>
      <Footer />
    </Box>
  );
};

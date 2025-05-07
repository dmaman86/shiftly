import { useCallback, useEffect, useState } from "react";

import { CircularProgress, Container, Stack, Typography } from "@mui/material";
import { format } from "date-fns";

import { WorkTable, ConfigPanel } from "@/components";
import { useAsync, useFetch } from "@/hooks";
import { service } from "@/utility";
import { ApiResponse } from "./models";

export const App = () => {
  const [values, setValues] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1-based
    baseRate: 0,
    standardHours: 6.67,
  });

  const [eventMap, setEventMap] = useState<Record<string, string[]> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const { callEndPoint } = useFetch();

  const handleChange = (field: keyof typeof values, value: number) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === "year" || field === "month") {
      setEventMap(null);
    }
  };

  useEffect(() => {
    const { year, month } = values;
    const start = new Date(year, month - 1, 1);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = new Date(nextYear, nextMonth - 1, 1);

    setDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  }, [values]);

  const getApiData = useCallback(async () => {
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) return { data: null, error: null };
    return await callEndPoint(service.getData(startDate, endDate));
  }, [dateRange, callEndPoint]);

  const handleApiResponse = useCallback(
    ({ data, error }: ApiResponse) => {
      if (eventMap === null) {
        if (data && !error) {
          setEventMap(data);
          setError(null);
        } else {
          setEventMap(null);
          setError(error);
        }
      }
    },
    [eventMap],
  );

  useAsync(getApiData, handleApiResponse, () => {}, [
    dateRange.startDate,
    dateRange.endDate,
  ]);

  // useEffect(() => {
  //   const loadEvents = async () => {
  //     const { startDate, endDate } = getDateRange(values.year, values.month);
  //     const { data, error } = await callEndPoint(
  //       service.getData(startDate, endDate),
  //     );
  //
  //     setEventMap(data);
  //     setError(error);
  //   };
  //
  //   loadEvents();
  // }, [values.year, values.month]);

  return (
    <Container sx={{ mt: 4 }}>
      <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          סיכום שעות עבודה
        </Typography>

        <ConfigPanel values={values} onChange={handleChange} />
        {error && (
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        )}
        {!eventMap ? (
          <CircularProgress sx={{ mt: 4 }} />
        ) : (
          <WorkTable values={values} eventMap={eventMap} />
        )}
      </Stack>
    </Container>
  );
};

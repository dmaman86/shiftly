import { useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import { WorkTable, ConfigPanel, MonthlySalarySummary } from "@/components";
import { useFetch, useGlobalState, useWorkDays } from "@/hooks";
import { service, DateUtils } from "@/utils";
import { ApiResponse } from "@/domain";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/context";

export const DailyPage = ({ domain }: { domain: DomainContextType }) => {
  const call = service();
  const { year, month, baseRate, reset } = useGlobalState();

  const { getDatesRange } = DateUtils();
  const { workDays, generate } = useWorkDays();

  const [error, setError] = useState<string | undefined>(undefined);

  const { loading, callEndPoint } = useFetch();

  useEffect(() => {
    const loadEvents = async () => {
      const { startDate, endDate } = getDatesRange(year, month);

      const { data, error }: ApiResponse<Record<string, string[]>> =
        await callEndPoint<Record<string, string[]>>(
          call.getData(startDate, endDate),
          buildEventMap,
        );
      // setEventMap(data);
      if (data) {
        generate(year, month, data);
        reset();
      }
      setError(error);
    };

    loadEvents();
  }, [year, month]);

  const hasData = workDays.length > 0;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        mt: 4,
      }}
    >
      <Stack spacing={3} sx={{ direction: "ltr" }}>
        <Box>
          <ConfigPanel domain={domain} mode={"daily"} />
          {error && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" color="error">
                {error}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 4 }}>
          {loading && <CircularProgress sx={{ mt: 4 }} />}
          {!loading && !error && hasData && (
            <WorkTable domain={domain} workDays={workDays} />
          )}
        </Box>

        {baseRate > 0 && (
          <Box>
            <MonthlySalarySummary domain={domain} />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

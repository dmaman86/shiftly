import { useId } from "react";
import {
  Box, Card, CardContent, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

type Series = { label: string; color: string };
export type ProfileChartRow = {
  id: string;
  label: string;
  values: number[] | null;
  unavailableLabel?: string;
};

export const ProfileBarChart = ({
  title, description, series, rows, stacked = false, currency = false,
}: {
  title: string;
  description: string;
  series: Series[];
  rows: ProfileChartRow[];
  stacked?: boolean;
  currency?: boolean;
}) => {
  const titleId = useId();
  const { t, i18n } = useTranslation("pages", { keyPrefix: "profile_page" });
  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage, {
    maximumFractionDigits: 2,
    ...(currency ? { style: "currency", currency: "ILS" } : {}),
  });
  const format = (value: number) => formatter.format(value);
  const maximum = Math.max(1, ...rows.map(({ values }) => !values ? 0 : stacked
    ? values.reduce((sum, value) => sum + value, 0)
    : Math.max(...values)));

  return (
    <Card component="section" aria-labelledby={titleId}>
      <CardContent>
        <Typography id={titleId} variant="h6" component="h2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} sx={{ mb: 2 }}>
          {series.map((item) => (
            <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
              <Box aria-hidden="true" sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: 0.5 }} />
              <Typography variant="caption">{item.label}</Typography>
            </Stack>
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary">{currency ? t("currency_axis") : t("hours_axis")}</Typography>
        <Stack spacing={1.5} sx={{ my: 1 }}>
          {rows.map((row) => (
            <Box key={row.id} sx={{ display: "grid", gridTemplateColumns: { xs: "90px 1fr", sm: "140px 1fr" }, gap: 1, alignItems: "center" }}>
              <Typography variant="caption">{row.label}</Typography>
              {!row.values ? (
                <Typography variant="caption" color="text.secondary">{row.unavailableLabel ?? t("no_records")}</Typography>
              ) : (
                <Box dir="ltr" sx={{ display: "flex", flexDirection: stacked ? "row" : "column", gap: stacked ? 0 : 0.5, minHeight: 24, alignItems: stacked ? "center" : undefined }}>
                  {row.values.map((value, index) => {
                    const item = series[index];
                    const label = `${row.label} · ${item.label}: ${format(value)}`;
                    return (
                      <Tooltip key={item.label} title={label} enterTouchDelay={0}>
                        <Box
                          tabIndex={0}
                          role="img"
                          aria-label={label}
                          sx={{
                            width: `${value / maximum * 100}%`,
                            minWidth: value > 0 ? 2 : 0,
                            flexShrink: 0,
                            height: 16,
                            bgcolor: item.color,
                            borderRadius: 0.5,
                            "&:focus-visible": { outline: "2px solid", outlineColor: "text.primary", outlineOffset: 2 },
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </Box>
          ))}
        </Stack>
        <Box aria-hidden="true" sx={{ display: "grid", gridTemplateColumns: { xs: "90px 1fr", sm: "140px 1fr" }, gap: 1, mb: 2 }}>
          <Box />
          <Box dir="ltr" sx={{ display: "flex", justifyContent: "space-between" }}>
            {[0, 0.5, 1].map((fraction) => <Typography key={fraction} variant="caption">{format(maximum * fraction)}</Typography>)}
          </Box>
        </Box>

        <Box component="details">
          <Box component="summary" sx={{ cursor: "pointer", typography: "body2", py: 1 }}>{t("show_values")}</Box>
          <TableContainer>
            <Table size="small" aria-label={title}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("month")}</TableCell>
                  {series.map((item) => <TableCell key={item.label} align="right">{item.label}</TableCell>)}
                  {stacked && <TableCell align="right">{t("total")}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell component="th" scope="row">{row.label}</TableCell>
                    {row.values ? <>
                      {row.values.map((value, index) => <TableCell key={series[index].label} align="right">{format(value)}</TableCell>)}
                      {stacked && <TableCell align="right">{format(row.values.reduce((sum, value) => sum + value, 0))}</TableCell>}
                    </> : <TableCell colSpan={series.length + (stacked ? 1 : 0)}>{row.unavailableLabel ?? t("no_records")}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

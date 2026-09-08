import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { PayBreakdownViewModel } from "@/domain";
import { formatValue } from "@/utils";
import { breakdownToDetailGroups, DetailGroupData } from "../mappers";
import { shabbatCreditHoursFromSpecial } from "../helpers";

type DayDetailsProps = {
  breakdown: PayBreakdownViewModel;
  id: string;
  showAbsence?: boolean;
  showAllowances?: boolean;
  showShabbatCreditUsed?: boolean;
};

type DetailGroupProps = Omit<DetailGroupData, "key">;

const DetailGroup = ({ items = [], sections, title }: DetailGroupProps) => {
  const columns = sections
    ? sections.flatMap((section) => section.items)
    : items;

  return (
    <Paper component="section" variant="outlined" sx={{ overflow: "hidden" }}>
      <Table size="small" sx={{ tableLayout: "fixed" }}>
        <TableHead>
          {title && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                component="th"
                scope="colgroup"
                align="center"
                sx={{
                  bgcolor: "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  fontWeight: "bold",
                  p: 0.75,
                }}
              >
                {title}
              </TableCell>
            </TableRow>
          )}
          {sections && (
            <TableRow>
              {sections.map((section) => (
                <TableCell
                  key={section.label}
                  colSpan={section.items.length}
                  component="th"
                  scope="colgroup"
                  align="center"
                  sx={{ fontWeight: "bold", p: 0.5 }}
                >
                  {section.label}
                </TableCell>
              ))}
            </TableRow>
          )}
          <TableRow>
            {columns.map(({ label }) => (
              <TableCell
                key={label}
                component="th"
                scope="col"
                align="center"
                sx={{
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  p: 0.5,
                }}
              >
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {columns.map(({ label, value }) => (
              <TableCell
                key={label}
                align="center"
                sx={{ fontWeight: "medium", p: 0.5 }}
              >
                {formatValue(value)}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};

export const DayDetails = ({
  breakdown,
  id,
  showAbsence = true,
  showAllowances = true,
  showShabbatCreditUsed = false,
}: DayDetailsProps) => {
  const { t } = useTranslation("work-table");

  const groups = breakdownToDetailGroups(
    breakdown,
    t,
    showAbsence,
    showAllowances,
    showShabbatCreditUsed,
  );
  const primaryGroups = groups.slice(0, 2);
  const secondaryGroups = groups.slice(2);
  const generatedShabbatCreditHours = shabbatCreditHoursFromSpecial(
    breakdown.special,
  );

  return (
    <Box
      id={id}
      role="region"
      aria-label={t("day_details.region_label")}
      sx={{
        bgcolor: "action.hover",
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          xs: "1fr",
          lg: `2fr ${secondaryGroups.length}fr`,
        },
        p: 1.5,
      }}
    >
      {generatedShabbatCreditHours > 0 && (
        <Alert severity="info" sx={{ gridColumn: "1 / -1" }}>
          {t("day_details.shabbat_credit_generated", {
            hours: formatValue(generatedShabbatCreditHours),
          })}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        {primaryGroups.map(({ key, ...group }) => (
          <DetailGroup key={key} {...group} />
        ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: `repeat(${secondaryGroups.length}, minmax(0, 1fr))`,
          },
        }}
      >
        {secondaryGroups.map(({ key, ...group }) => (
          <DetailGroup key={key} {...group} />
        ))}
      </Box>
    </Box>
  );
};

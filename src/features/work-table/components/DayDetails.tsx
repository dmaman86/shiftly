import {
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

type DayDetailsProps = {
  breakdown: PayBreakdownViewModel;
  id: string;
  showAbsence?: boolean;
};

type DetailItem = {
  label: string;
  value: number;
};

type DetailSection = {
  items: DetailItem[];
  label: string;
};

type DetailGroupProps = {
  items?: DetailItem[];
  sections?: DetailSection[];
  title?: string;
};

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
}: DayDetailsProps) => {
  const { t } = useTranslation("work-table");

  const groups: DetailGroupProps[] = [
    {
      title: t("headers.overtime"),
      items: [
        { label: "100%", value: breakdown.regular.hours100.hours },
        { label: "125%", value: breakdown.regular.hours125.hours },
        { label: "150%", value: breakdown.regular.hours150.hours },
      ],
    },
    {
      title: t("headers.shabbat"),
      items: [
        { label: "150%", value: breakdown.special.shabbat150.hours },
        { label: "200%", value: breakdown.special.shabbat200.hours },
        {
          label: t("headers.shabbat_credit"),
          value: breakdown.appliedShabbatCredit.hours,
        },
      ],
    },
    {
      title: t("headers.extras"),
      items: [
        { label: "20%", value: breakdown.extra.hours20.hours },
        { label: "50%", value: breakdown.extra.hours50.hours },
      ],
    },
    ...(showAbsence
      ? [
          {
            title: t("headers.absence"),
            items: [
              {
                label: t("headers.sick"),
                value: breakdown.hours100Sick.hours,
              },
              {
                label: t("headers.vacation"),
                value: breakdown.hours100Vacation.hours,
              },
            ],
          },
        ]
      : []),
    {
      sections: [
        {
          label: t("headers.meal_allowance"),
          items: [
            {
              label: t("day_details.points"),
              value: breakdown.perDiemPoints,
            },
          ],
        },
        {
          label: t("headers.meal_per_diem"),
          items: [
            { label: t("headers.large"), value: breakdown.largePoints },
            { label: t("headers.small"), value: breakdown.smallPoints },
          ],
        },
      ],
    },
  ];
  const primaryGroups = groups.slice(0, 2);
  const secondaryGroups = groups.slice(2);

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
        {primaryGroups.map((group) => (
          <DetailGroup
            key={
              group.title ?? group.sections?.map((section) => section.label).join("-")
            }
            {...group}
          />
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
        {secondaryGroups.map((group) => (
          <DetailGroup
            key={
              group.title ?? group.sections?.map((section) => section.label).join("-")
            }
            {...group}
          />
        ))}
      </Box>
    </Box>
  );
};

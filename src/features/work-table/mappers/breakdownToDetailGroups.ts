import { TFunction } from "i18next";

import { PayBreakdownViewModel } from "@/domain";

export type DetailItem = { label: string; value: number };
export type DetailSection = { label: string; items: DetailItem[] };
export type DetailGroupData = {
  key: string;
  title?: string;
  items?: DetailItem[];
  sections?: DetailSection[];
};

type Translate = TFunction<"work-table">;

/**
 * Builds the per-day breakdown groups (overtime, shabbat, extras, absence,
 * meal allowance) shared by the desktop grid (DayDetails) and the mobile
 * nested accordion (DayCardDetails) — only the group/label/value data is
 * shared; each layout owns its own presentation of it.
 */
export const breakdownToDetailGroups = (
  breakdown: PayBreakdownViewModel,
  t: Translate,
  showAbsence: boolean,
  showAllowances = true,
): DetailGroupData[] => [
  {
    key: "overtime",
    title: t("headers.overtime"),
    items: [
      { label: "100%", value: breakdown.regular.hours100.hours },
      { label: "125%", value: breakdown.regular.hours125.hours },
      { label: "150%", value: breakdown.regular.hours150.hours },
    ],
  },
  {
    key: "shabbat",
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
    key: "extras",
    title: t("headers.extras"),
    items: [
      { label: "20%", value: breakdown.extra.hours20.hours },
      { label: "50%", value: breakdown.extra.hours50.hours },
    ],
  },
  ...(showAbsence
    ? [
        {
          key: "absence",
          title: t("headers.absence"),
          items: [
            { label: t("headers.sick"), value: breakdown.hours100Sick.hours },
            {
              label: t("headers.vacation"),
              value: breakdown.hours100Vacation.hours,
            },
          ],
        },
      ]
    : []),
  ...(showAllowances
    ? [
        {
          key: "meal",
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
      ]
    : []),
];

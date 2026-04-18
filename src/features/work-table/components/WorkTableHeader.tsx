import { TableHeader, TableViewMode } from "@/domain";
import { TableCell, TableHead, TableRow } from "@mui/material";
import { useTranslation } from "react-i18next";
import { filterHeadersByViewMode } from "../helpers";

type HeaderKey =
  | "day" | "sick" | "vacation" | "hours" | "total_hours"
  | "regular" | "extras" | "overtime" | "shabbat" | "absence"
  | "meal_allowance" | "meal_per_diem" | "large" | "small"
  | "shabbat_eve_bonus" | "entry" | "exit";

const HEADER_KEY_MAP: Record<string, HeaderKey> = {
  "יום": "day",
  "מחלה": "sick",
  "חופש": "vacation",
  "שעות": "hours",
  "סך שעות": "total_hours",
  "רגילות": "regular",
  "תוספות": "extras",
  "ש״נ": "overtime",
  "שבת": "shabbat",
  "היעדרות": "absence",
  "אש״ל": "meal_allowance",
  "כלכלה": "meal_per_diem",
  "גדולה": "large",
  "קטנה": "small",
  "ז. שבת ": "shabbat_eve_bonus",
  "כניסה": "entry",
  "יציאה": "exit",
};

type WorkTableHeaderProps = {
  headers: TableHeader[];
  baseRate: number;
  viewMode: TableViewMode; // Current active view mode
};

export const WorkTableHeader = ({
  headers,
  baseRate,
  viewMode,
}: WorkTableHeaderProps) => {
  const { t } = useTranslation("work-table");

  const tLabel = (label: string): string => {
    const key = HEADER_KEY_MAP[label];
    return key ? t(`headers.${key}`) : label;
  };

  const filteredHeaders = filterHeadersByViewMode(headers, viewMode);

  return (
    <TableHead
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 3,
        backgroundColor: "white",
      }}
    >
      {/* Row 1: Main headers */}
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        {filteredHeaders.map((header, i) => {
          const span = header.children?.length ?? 1;
          const totalWidth = header.widths
            ? header.widths.reduce((a, b) => a + b, 0)
            : span * 50;

          return (
            <TableCell
              key={`group-${i}`}
              colSpan={span}
              rowSpan={header.children?.length ? 1 : (header.rowSpan ?? 2)}
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                verticalAlign: "middle",
                minWidth: totalWidth,
                borderTop: "1px solid black",
                borderBottom: header.children?.length
                  ? "none !important"
                  : "1px solid black",
                borderLeft: i === 0 ? "1px solid black" : "none",
                borderRight: "1px solid black",
                p: 0.5,
              }}
            >
              {tLabel(header.label)}
            </TableCell>
          );
        })}

        {baseRate > 0 && (
          <TableCell
            rowSpan={2}
            sx={{
              fontWeight: "bold",
              minWidth: 96,
              borderTop: "1px solid black",
              borderBottom: "1px solid black",
              borderLeft: "none",
              borderRight: "1px solid black",
              textAlign: "center",
              verticalAlign: "middle",
              p: 0.5,
            }}
          >
            {t("daily_salary_header")}
          </TableCell>
        )}
      </TableRow>

      {/* Row 2: Sub-headers */}
      <TableRow sx={{ "& > *": { borderTop: "unset" } }}>
        {filteredHeaders.flatMap((header, headerIndex) => {
          if (!header.children) return [];

          return header.children.map((child, childIndex) => {
            const isLastChild = childIndex === header.children!.length - 1;
            const isFirstOverall = headerIndex === 0 && childIndex === 0;

            return (
              <TableCell
                key={`child-${headerIndex}-${childIndex}`}
                sx={{
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  width: header.widths?.[childIndex] ?? 50,
                  borderTop: "none !important",
                  borderBottom: "1px solid black",
                  borderLeft: isFirstOverall ? "1px solid black" : "none",
                  borderRight: isLastChild ? "1px solid black" : "none",
                  p: 0.5,
                }}
              >
                {tLabel(child)}
              </TableCell>
            );
          });
        })}
      </TableRow>
    </TableHead>
  );
};

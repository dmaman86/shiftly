import { TableHeader, TableViewMode } from "@/domain";
import { TableCell, TableHead, TableRow } from "@mui/material";
import { filterHeadersByViewMode } from "../helpers";

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
  // Filter headers based on current view mode
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
              {header.label}
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
            שכר יומי
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
                {child}
              </TableCell>
            );
          });
        })}
      </TableRow>
    </TableHead>
  );
};

import { TableHeader } from "@/domain";
import { TableCell, TableHead, TableRow, Box, Stack } from "@mui/material";

type WorkTableHeaderProps = {
  headers: TableHeader[];
  baseRate: number;
};

export const WorkTableHeader = ({
  headers,
  baseRate,
}: WorkTableHeaderProps) => {
  return (
    <TableHead
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 3,
        backgroundColor: "white",
      }}
    >
      <TableRow>
        {headers.map((header, i) => {
          const span = header.children?.length ?? 1;

          return (
            <TableCell
              key={`group-${i}`}
              colSpan={span}
              rowSpan={header.children ? 1 : (header.rowSpan ?? 2)}
              sx={{
                fontWeight: "bold",
                minWidth: `${span * 50}px`,
                position: "relative",
                border: "1px solid black",
              }}
            >
              <Box sx={{ fontWeight: "bold" }}>{header.label}</Box>

              {header.children && (
                <Stack direction="row" sx={{ textAlign: "center" }}>
                  {header.children.map((child, j) => (
                    <Box key={`child-${i}-${j}`} sx={{ flex: 1 }}>
                      {child}
                    </Box>
                  ))}
                </Stack>
              )}
            </TableCell>
          );
        })}

        {baseRate > 0 && (
          <TableCell
            sx={{
              fontWeight: "bold",
              minWidth: "50px",
              position: "relative",
              border: "1px solid black",
            }}
          >
            שכר יומי
          </TableCell>
        )}
      </TableRow>

      {/* Invisible row for column alignment */}
      <TableRow style={{ display: "none" }}>
        {headers.flatMap((header, i) =>
          header.children
            ? header.children.map((_, j) => (
                <TableCell key={`invisible-${i}-${j}`} />
              ))
            : [<TableCell key={`col-flat-${i}`} />],
        )}
        {baseRate > 0 && <TableCell />}
      </TableRow>
    </TableHead>
  );
};

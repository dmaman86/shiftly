import { TableHeader } from "@/domain";
import { TableCell, TableHead, TableRow } from "@mui/material";

type WorkTableHeaderProps = {
  headers: TableHeader[];
  baseRate: number;
};

export const WorkTableHeader = ({
  headers,
  baseRate,
}: WorkTableHeaderProps) => {
  return (
    <TableHead>
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
              <div className="row">
                <div className="col-12 fw-bold">{header.label}</div>
              </div>

              {header.children && (
                <div className="row text-center">
                  {header.children.map((child, j) => (
                    <div className="col" key={`child-${i}-${j}`}>
                      {child}
                    </div>
                  ))}
                </div>
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

import { Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";

export const baseCellSx = (isFooter: boolean): SystemStyleObject<Theme> => ({
  textAlign: "center",
  ...(isFooter ? {} : { minWidth: "90px" }),
});

export const rightBorderIfNotFooter = (
  isFooter: boolean,
): SystemStyleObject<Theme> => ({
  ...(isFooter ? {} : { borderRight: "1px solid black" }),
});

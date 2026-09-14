import { forwardRef } from "react";
import { Card, type CardProps } from "@mui/material";

export const CardSurface = forwardRef<HTMLDivElement, CardProps>(
  ({ sx, ...props }, ref) => (
    <Card
      {...props}
      ref={ref}
      variant="outlined"
      sx={[{ borderRadius: 2 }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  ),
);

CardSurface.displayName = "CardSurface";

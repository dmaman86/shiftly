import { forwardRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, IconButton, Tooltip, type CardProps, type SxProps, type Theme } from "@mui/material";
import { CardSurface } from "./CardSurface";

type CollapsibleCardProps = Omit<CardProps, "children"> & {
  children: React.ReactNode;
  collapsibleContent: React.ReactNode;
  detailsId: string;
  header: React.ReactNode;
  regionLabel: string;
  expandedLabel: string;
  collapsedLabel: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  detailsSx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
};

export const CollapsibleCard = forwardRef<HTMLDivElement, CollapsibleCardProps>(
  (
    {
      children,
      collapsibleContent,
      detailsId,
      header,
      regionLabel,
      expandedLabel,
      collapsedLabel,
      defaultExpanded = false,
      expanded: controlledExpanded,
      onExpand,
      onExpandedChange,
      detailsSx,
      headerSx,
      sx,
      ...cardProps
    },
    ref,
  ) => {
    const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
    const expanded = controlledExpanded ?? uncontrolledExpanded;
    const toggle = () => {
      const next = !expanded;
      if (controlledExpanded === undefined) setUncontrolledExpanded(next);
      if (next) onExpand?.();
      onExpandedChange?.(next);
    };

    return (
      <CardSurface {...cardProps} ref={ref} sx={sx}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggle();
            }
          }}
          sx={[
            {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            },
            ...(Array.isArray(headerSx) ? headerSx : [headerSx]),
          ]}
        >
          {header}
          <Tooltip title={expanded ? expandedLabel : collapsedLabel}>
            <IconButton
              size="small"
              aria-label={expanded ? expandedLabel : collapsedLabel}
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
              sx={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {children}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box id={detailsId} role="region" aria-label={regionLabel} sx={detailsSx}>
            {collapsibleContent}
          </Box>
        </Collapse>
      </CardSurface>
    );
  },
);

CollapsibleCard.displayName = "CollapsibleCard";

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, CircularProgress } from "@mui/material";
import { useMonthlyConfigStatus } from "./monthlyConfigStatusContext";

/** Retain the last content height without exposing another period's data. */
export const MonthlyContentBoundary = ({
  children,
  loading = false,
  minHeight = 80,
}: {
  children: ReactNode;
  loading?: boolean;
  minHeight?: number;
}) => {
  const { ready, contextKey, fallback } = useMonthlyConfigStatus();
  const busy = !ready || loading;
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (busy || !element) return;
    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [busy, contextKey]);

  return (
    <Box
      aria-busy={busy}
      sx={{
        minHeight: busy ? Math.max(height, minHeight) : undefined,
        // Replaced monthly nodes must not become the browser's scroll anchor.
        overflowAnchor: "none",
      }}
    >
      {busy ? (
        !ready && fallback ? (
          fallback
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )
      ) : (
        <div ref={contentRef}>
          <Fragment key={contextKey}>{children}</Fragment>
        </div>
      )}
    </Box>
  );
};

import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

export const CalculationStatus = ({ message }: { message: string }) => {
  const previousMessage = useRef(message);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (message === previousMessage.current) return;
    const timer = setTimeout(() => {
      previousMessage.current = message;
      setAnnouncement(message);
    }, 1000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <Box role="status" aria-live="polite" aria-atomic="true" sx={visuallyHidden}>
      {announcement}
    </Box>
  );
};

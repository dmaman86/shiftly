import { Box } from "@mui/material";
import { TimeField } from "@mui/x-date-pickers";
import { useId } from "react";

interface ShiftTimeInputProps {
  value: Date;
  label: string;
  disabled: boolean;
  onChange: (val: Date | null) => void;
  error?: boolean;
  testId?: string;
  accessibleLabel?: string;
  errorMessage?: string;
}

export const ShiftTimeInput = ({
  value,
  label,
  disabled,
  onChange,
  error = false,
  testId,
  accessibleLabel,
  errorMessage,
}: ShiftTimeInputProps) => {
  const messageId = useId();
  return (
    <Box data-testid={testId}>
      <TimeField
        size="small"
        label={label}
        value={value}
        disabled={disabled}
        error={error}
        onChange={onChange}
        format="HH:mm"
        ampm={false}
        slotProps={{ textField: { InputProps: {
          "aria-label": accessibleLabel || label,
          "aria-labelledby": undefined,
          "aria-describedby": error && errorMessage ? messageId : undefined,
        } } }}
        sx={{
          width: 80,
          maxWidth: 80,
          "& .MuiInputBase-root": {
            fontSize: "0.875rem",
          },
          "& .MuiInputBase-input": {
            py: 0.75,
            px: 1,
            textAlign: "center",
          },
        }}
      />
      {error && errorMessage && (
        <Box id={messageId} sx={{ fontSize: "0.75rem", color: "error.main" }}>
          {errorMessage}
        </Box>
      )}
    </Box>
  );
};

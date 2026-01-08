import { TimeField } from "@mui/x-date-pickers";

interface ShiftTimeInputProps {
  value: Date;
  label: string;
  disabled: boolean;
  onChange: (val: Date | null) => void;
  error?: boolean;
}

export const ShiftTimeInput = ({
  value,
  label,
  disabled,
  onChange,
  error = false,
}: ShiftTimeInputProps) => {
  return (
    <TimeField
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      error={error}
      onChange={onChange}
      format="HH:mm"
      ampm={false}
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
  );
};

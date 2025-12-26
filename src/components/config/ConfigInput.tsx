import { TextField } from "@mui/material";

interface ConfigInputProps {
  name: string;
  value: string;
  label: string;
  type?: "number" | "text";
  variant?: "outlined" | "filled" | "standard";
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  onChange: (newValue: string) => void;
  onBlur?: () => void;
}

export const ConfigInput = ({
  name,
  value,
  label,
  type = "text",
  variant = "outlined",
  disabled = false,
  helperText,
  error = false,
  onChange,
  onBlur,
}: ConfigInputProps) => {
  return (
    <TextField
      size="small"
      id={name}
      name={name}
      variant={variant}
      type={type}
      label={label}
      value={value}
      disabled={disabled}
      error={error}
      helperText={helperText}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      fullWidth
    />
  );
};

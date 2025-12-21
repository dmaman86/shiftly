import { TextField } from "@mui/material";

interface ConfigInputProps {
  name: string;
  value: number | string;
  label: string;
  type?: "number" | "text";
  variant?: "outlined" | "filled" | "standard";
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  onChange: (newValue: number) => void;
}

export const ConfigInput = ({
  name,
  value,
  label,
  type = "number",
  variant = "outlined",
  disabled = false,
  helperText,
  error = false,
  onChange,
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
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (!isNaN(parsed)) onChange(parsed);
      }}
      fullWidth
    />
  );
};

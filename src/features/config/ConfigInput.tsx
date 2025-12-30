import { InputAdornment, TextField } from "@mui/material";

interface ConfigInputProps {
  name: string;
  value: string;
  label: string;
  type?: "number" | "text";
  variant?: "outlined" | "filled" | "standard";
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  icon?: React.ReactNode;
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
  icon,
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
      slotProps={{
        input: {
          startAdornment: icon ? (
            <InputAdornment position="start">{icon}</InputAdornment>
          ) : null,
        },
      }}
    />
  );
};

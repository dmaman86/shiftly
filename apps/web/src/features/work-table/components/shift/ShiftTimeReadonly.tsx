import { TextField } from "@mui/material";

import { minutesToTimeStr } from "@/utils";

interface ShiftTimeInputProps {
  label: string;
  minutes: number;
}

export const ShiftTimeReadonly = ({ label, minutes }: ShiftTimeInputProps) => {
  return (
    <TextField
      size="small"
      label={label}
      value={minutesToTimeStr(minutes)}
      slotProps={{ input: { readOnly: true } }}
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

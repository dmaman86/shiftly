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
      sx={{ width: 100 }}
    />
  );
};

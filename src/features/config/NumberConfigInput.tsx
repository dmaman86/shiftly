import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks";
import { ConfigInput } from "./ConfigInput";

type NumberConfigInputProps = {
  name: string;
  value: number;
  label: string;
  helperText?: string;
  allowEmpty?: boolean;
  isValid?: (parsed: number) => boolean;
  onChange: (value: number) => void;
};

const defaultIsValid = (parsed: number) => parsed >= 0;

/**
 * Text input backed by a number: the caller only ever sees/produces a
 * `number`, while the free-typed intermediate text (partial decimals, a
 * lone "-", an empty field) stays entirely local. A draft is only committed
 * once it settles (debounced) and parses to a value `isValid` accepts;
 * invalid drafts are shown with an error but never committed.
 */
export const NumberConfigInput = ({
  name,
  value,
  label,
  helperText,
  allowEmpty = true,
  isValid = defaultIsValid,
  onChange,
}: NumberConfigInputProps) => {
  const [draft, setDraft] = useState<string>();

  // Reset the local draft whenever the committed value changes for any
  // reason - our own debounced commit below, or an external one (e.g. a
  // month switch re-hydrating config from storage). Resetting during render
  // (React's documented pattern for this) avoids an extra commit and a
  // flash of a now-stale draft that resetting from inside an effect would
  // cause.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(undefined);
  }

  const debouncedDraft = useDebounce({ value: draft });

  useEffect(() => {
    if (debouncedDraft === undefined || debouncedDraft === "") return;
    const parsed = Number(debouncedDraft);
    if (!Number.isFinite(parsed) || !isValid(parsed)) return;
    if (parsed !== value) onChange(parsed);
  }, [debouncedDraft, value, onChange, isValid]);

  const displayValue = draft ?? value.toString();
  const parsed = Number(displayValue);
  const error =
    displayValue === ""
      ? !allowEmpty
      : !Number.isFinite(parsed) || !isValid(parsed);

  return (
    <ConfigInput
      name={name}
      value={displayValue}
      label={label}
      helperText={helperText}
      error={error}
      onChange={setDraft}
    />
  );
};

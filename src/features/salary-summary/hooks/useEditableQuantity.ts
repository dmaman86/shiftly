import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks";

type UseEditableQuantityParams = {
  value: number;
  enabled: boolean;
  delay?: number;
  onCommit: (value: number) => void;
};

export const useEditableQuantity = ({
  value,
  enabled,
  delay = 500,
  onCommit,
}: UseEditableQuantityParams) => {
  const [inputValue, setInputValue] = useState(value.toString());

  const debouncedValue = useDebounce({ value: inputValue, delay });

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (!enabled) return;

    const parsed = parseFloat(debouncedValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== value) {
      onCommit(parsed);
    }
  }, [debouncedValue, enabled, onCommit, value]);

  return {
    inputValue,
    onInputChange: setInputValue,
  };
};

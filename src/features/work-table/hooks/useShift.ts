import { useCallback, useState } from "react";

import { Shift } from "@/domain";

type ShiftProps = {
  shift: Shift;
};

export const useShift = ({
  shift,
}: ShiftProps) => {
  const [localShift, setLocalShift] = useState<Shift>(shift);
  const [saved, setSaved] = useState<boolean>(false);

  const replace = useCallback((nextShift: Shift) => {
    setLocalShift(nextShift);
  }, []);

  return {
    localShift,
    replace,
    saved,
    setSaved,
  };
};

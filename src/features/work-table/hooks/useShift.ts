import { useCallback, useState } from "react";

import { Shift, TimeFieldType } from "@/domain";

type ShiftProps = {
  shift: Shift;
};

export const useShift = ({
  shift,
}: ShiftProps) => {
  const [localShift, setLocalShift] = useState<Shift>(shift);
  const [saved, setSaved] = useState<boolean>(false);

  const update = useCallback(
    (newStart: TimeFieldType, newEnd: TimeFieldType) => {
      setLocalShift((prev) => ({
        ...prev,
        start: newStart,
        end: newEnd,
      }));
    },
    [],
  );

  const toggleDuty = useCallback(() => {
    setLocalShift((prev) => ({
      ...prev,
      isDuty: !prev.isDuty,
    }));
  }, []);

  return {
    localShift,
    update,
    toggleDuty,
    saved,
    setSaved,
  };
};

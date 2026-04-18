import { createContext } from "react";

export type Direction = "rtl" | "ltr";

export type DirectionContextType = {
  direction: Direction;
  toggleDirection: () => void;
};

export const DirectionContext = createContext<DirectionContextType>({
  direction: "rtl",
  toggleDirection: () => {},
});

import { createContext } from "react";

export type Direction = "rtl" | "ltr";

export type DirectionContextType = {
  direction: Direction;
  setDirection: (d: Direction) => void;
};

export const DirectionContext = createContext<DirectionContextType>({
  direction: "rtl",
  setDirection: () => {},
});

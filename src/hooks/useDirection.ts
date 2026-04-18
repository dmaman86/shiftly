import { useContext } from "react";
import { DirectionContext } from "@/app";

export const useDirection = () => useContext(DirectionContext);

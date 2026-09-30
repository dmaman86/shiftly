import { createContext } from "react";
import { DomainContextType } from "@/app/domain";

export const DomainContext = createContext<DomainContextType>(
  null as unknown as DomainContextType,
);

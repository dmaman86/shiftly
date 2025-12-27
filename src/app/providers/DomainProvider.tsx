import { ReactNode } from "react";

import { DomainContext } from "./domainContext";
import { DomainContextType, domain } from "@/app/domain";

interface DomainProviderProps {
  children: ReactNode;
  override?: DomainContextType;
}

export const DomainProvider = ({ children, override }: DomainProviderProps) => {
  const value = override || domain;

  return (
    <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
  );
};

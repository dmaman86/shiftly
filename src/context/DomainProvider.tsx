import { createContext, useContext, ReactNode } from "react";

import { DomainContextType, domain } from "./instance";

const DomainContext = createContext<DomainContextType | null>(null);

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

export const useDomain = () => {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomain must be used within DomainProvider");
  return ctx;
};

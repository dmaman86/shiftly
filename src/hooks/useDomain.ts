import { useContext } from "react";

import { DomainContext } from "@/app";

export const useDomain = () => {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomain must be used within DomainProvider");
  return ctx;
};

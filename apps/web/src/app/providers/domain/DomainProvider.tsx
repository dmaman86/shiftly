import { ReactNode, useMemo } from "react";

import { DomainContext } from "./domainContext";
import { ReferenceStatusContext } from "./referenceStatusContext";
import { useReferenceTimelines } from "./useReferenceTimelines";
import { DomainContextType, createDomainContext } from "@/app/domain";

interface DomainProviderProps {
  children: ReactNode;
  override?: DomainContextType;
}

export const DomainProvider = ({ children, override }: DomainProviderProps) =>
  override ? (
    <DomainContext.Provider value={override}>{children}</DomainContext.Provider>
  ) : (
    <PublishedDomainProvider>{children}</PublishedDomainProvider>
  );

/** Calculates with the published rates, rebuilt only when their values change. */
const PublishedDomainProvider = ({ children }: { children: ReactNode }) => {
  const { references, status } = useReferenceTimelines();
  const { resolver, version } = references;
  const domain = useMemo(
    () => createDomainContext({ resolver, version }),
    // The version fingerprints the values: a new resolver with the same
    // values must not recalculate every month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return (
    <DomainContext.Provider value={domain}>
      <ReferenceStatusContext.Provider value={status}>
        {children}
      </ReferenceStatusContext.Provider>
    </DomainContext.Provider>
  );
};

import { createContext, useContext, ReactNode, useMemo } from "react";
import {
  createShiftResolverService,
  createRegularService,
  createGenericBreakdownFactory,
  createPerDiemService,
  createShiftMapBuilderService,
  createWorkPayMapBuilderService,
  createHolidayResolverService,
} from "@/domain";
import { fieldShiftPercent, fieldMinutes } from "@/constants";

type ShiftResolver = ReturnType<ReturnType<typeof createShiftResolverService>['build']>;

type GenericBreakdownService<T extends Record<string, number>> = 
  ReturnType<typeof createGenericBreakdownFactory<T>>;

type ExtraPercent = {
  hours20: number;
  hours50: number;
};

type SpecialPercent = {
  shabbat150: number;
  shabbat200: number;
};



export type DomainContextType = {
  resolvers: {
    shiftResolver: ShiftResolver;
    holidayResolver: ReturnType<typeof createHolidayResolverService>;
  };
  factories: {
    regularService: ReturnType<typeof createRegularService>;
    extraService: GenericBreakdownService<ExtraPercent>;
    specialService: GenericBreakdownService<SpecialPercent>;
    perDiemService: ReturnType<typeof createPerDiemService>;
  };
  builders: {
    shiftMapBuilderService: ReturnType<typeof createShiftMapBuilderService>;
    workPayMapBuilderService: ReturnType<typeof createWorkPayMapBuilderService>;
  };
};

const DomainContext = createContext<DomainContextType | null>(null);

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  
  const extraPercent = useMemo(() => ({
    hours20: fieldShiftPercent.hours20,
    hours50: fieldShiftPercent.hours50,
  }), []);

  const specialPercent = useMemo(() => ({
    shabbat150: fieldShiftPercent.hours150,
    shabbat200: fieldShiftPercent.hours200,
  }), []);

  const regularService = useMemo(() => createRegularService(fieldShiftPercent),[]);

  const extraService = useMemo(() => createGenericBreakdownFactory(extraPercent),[]);

  const specialService = useMemo(() => createGenericBreakdownFactory(specialPercent),[]);

  const perDiemService = useMemo(() => createPerDiemService(),[]);
  
  const shiftResolver = useMemo(() => 
    createShiftResolverService()
      .withFieldMinutes(fieldMinutes)
      .withFieldShiftPercent(fieldShiftPercent)
      .build(),
  []);

  const holidayResolver = useMemo(() => createHolidayResolverService(), []);

  const shiftMapBuilderService = useMemo(() => 
    createShiftMapBuilderService(
      shiftResolver,
      fieldShiftPercent,
      regularService,
      createGenericBreakdownFactory,
      perDiemService,
    ), []);

  const workPayMapBuilderService = useMemo(
    () => createWorkPayMapBuilderService(
      fieldShiftPercent,
      regularService,
      createGenericBreakdownFactory,
      perDiemService,
    ),
  []);

  const value = {
    resolvers: { shiftResolver, holidayResolver },
    factories: { regularService, extraService, specialService, perDiemService },
    builders: { shiftMapBuilderService, workPayMapBuilderService },
  };

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = () => useContext(DomainContext);

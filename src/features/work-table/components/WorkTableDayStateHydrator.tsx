import { DomainContextType } from "@/app";
import { WorkDayInfo } from "@/domain";
import { useHydrateWorkTableDayState } from "@/features/work-table/hooks/useHydrateWorkTableDayState";

type WorkTableDayStateHydratorProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

/**
 * Renders nothing - exists only so hydration can consume
 * WorkTableDayStateContext as a child of WorkTableDayStateProvider, keeping
 * the provider itself free of auth/fetch dependencies.
 */
export const WorkTableDayStateHydrator = ({
  domain,
  workDays,
}: WorkTableDayStateHydratorProps) => {
  useHydrateWorkTableDayState({ domain, workDays });
  return null;
};

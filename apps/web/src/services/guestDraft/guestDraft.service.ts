import type { EndpointCall } from "@/app/types/api.types";
import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";
import type { GuestDraft } from "./guestDraft.storage";

export const guestDraftService = () => {
  // A single RPC so replacing the month is atomic (see the
  // import_guest_month migration). Shift ids are omitted on purpose: the
  // server generates them and never trusts client-supplied ids.
  const importMonth = (draft: GuestDraft): EndpointCall<null> => ({
    call: async () =>
      fromSupabaseResult<null>(
        await supabase.rpc("import_guest_month", {
          p_year: draft.year,
          p_month: draft.month,
          p_standard_hours: draft.config.standardHours,
          p_base_rate: draft.config.baseRate,
          p_days: draft.days,
          p_shifts: draft.shifts.map(
            ({ date, start_time, end_time, is_duty }) => ({
              date,
              start_time,
              end_time,
              is_duty,
            }),
          ),
        }),
      ),
  });

  return { importMonth };
};

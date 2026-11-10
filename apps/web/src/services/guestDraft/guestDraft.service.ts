import type { EndpointCall } from "@/app/types/api.types";
import { apiClient } from "@/services/api/client";
import type { GuestDraft } from "./guestDraft.storage";

export const guestDraftService = () => {
  // A single request so replacing the month is atomic (see the
  // api_import_guest_month migration). Shift ids are omitted on purpose: the
  // server generates them and never trusts client-supplied ids.
  //
  // `ownerId` is the account the import was checked and confirmed for: it is
  // never sent, and if another account has signed in since, nothing is sent
  // (see ApiRequest.expectedUserId), so a month confirmed for one account
  // never replaces another's.
  const importMonth = (
    ownerId: string,
    draft: GuestDraft,
  ): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "POST",
        path: `/me/months/${draft.year}/${draft.month}/guest-import`,
        body: {
          standardHours: draft.config.standardHours,
          baseRate: draft.config.baseRate,
          days: draft.days.map(({ date, status }) => ({ date, status })),
          shifts: draft.shifts.map(
            ({ date, start_time, end_time, is_duty }) => ({
              date,
              startTime: start_time,
              endTime: end_time,
              isDuty: is_duty,
            }),
          ),
        },
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  return { importMonth };
};

import type { EndpointCall } from "@/app/types/api.types";
import { apiClient } from "@/services/api/client";

export const accountService = () => {
  // Irreversible, so the account to delete is named by the caller: `ownerId`
  // is the account the confirmation dialog showed. It is never sent (the API
  // deletes the token's user), and if another account has signed in since,
  // nothing is sent at all (see ApiRequest.expectedUserId).
  const deleteCurrentAccount = (ownerId: string): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "DELETE",
        path: "/me/account",
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  return { deleteCurrentAccount };
};

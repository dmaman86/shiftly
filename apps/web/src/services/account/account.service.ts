import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";

type DeleteAccountResult = {
  deleted: boolean;
};

export const accountService = () => {
  const deleteCurrentAccount = () => ({
    call: async () =>
      fromSupabaseResult<DeleteAccountResult>(
        await supabase.functions.invoke("delete-account", {
          method: "DELETE",
        }),
      ),
  });

  return { deleteCurrentAccount };
};

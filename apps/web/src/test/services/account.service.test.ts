import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { accountService } from "@/services/account/account.service";

describe("accountService", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the account deletion edge function", async () => {
    invokeMock.mockResolvedValue({ data: { deleted: true }, error: null });

    const result = await accountService().deleteCurrentAccount().call();

    expect(invokeMock).toHaveBeenCalledWith("delete-account", {
      method: "DELETE",
    });
    expect(result).toEqual({ data: { deleted: true } });
  });

  it("returns an error when the edge function fails", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "Authentication is required" },
    });

    const result = await accountService().deleteCurrentAccount().call();

    expect(result).toEqual({ error: "Authentication is required" });
  });
});

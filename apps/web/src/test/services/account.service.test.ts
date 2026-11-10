import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({
  apiClient: { request: requestMock },
}));

import { accountService } from "@/services/account/account.service";

describe("accountService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("deletes the signed-in account through the API, only if it is the one shown", async () => {
    requestMock.mockResolvedValue({ data: null });

    const result = await accountService().deleteCurrentAccount("user-1").call();

    expect(requestMock).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/me/account",
      authenticated: true,
      expectedUserId: "user-1",
    });
    expect(result).toEqual({ data: null });
  });

  it("passes the API error through", async () => {
    requestMock.mockResolvedValue({ error: "session_changed" });

    const result = await accountService().deleteCurrentAccount("user-1").call();

    expect(result).toEqual({ error: "session_changed" });
  });
});

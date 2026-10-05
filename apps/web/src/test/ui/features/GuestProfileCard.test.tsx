import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import i18n from "@/i18n";

vi.mock("@/services/supabase/supabase.client", () => ({
  supabase: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock("@/hooks", () => ({
  useAppSnackbar: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  useFetch: () => ({
    loading: false,
    callEndPoint: vi.fn(),
    cancelEndPoint: vi.fn(),
  }),
}));

import { GuestProfileCard } from "@/features/auth/GuestProfileCard";

describe("GuestProfileCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("identifies the visitor as a guest and offers a single Google sign-in", () => {
    render(<GuestProfileCard />);
    expect(
      screen.getByRole("region", { name: "👤 Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(
      screen.getByText("Not signed in · data is not saved"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Continue with Google" }),
    ).toHaveLength(1);
  });

  it("renders Hebrew guest copy", async () => {
    await act(async () => {
      await i18n.changeLanguage("he");
    });
    render(<GuestProfileCard />);
    expect(screen.getByText("מצב אורח")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "המשך עם Google" }),
    ).toBeInTheDocument();
  });
});

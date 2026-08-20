import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Footer } from "@/layout/Footer";
import { analyticsService } from "@/services";

vi.mock("@/services", () => ({
  analyticsService: { track: vi.fn() },
}));

vi.mock("@/features", () => ({
  INFO_DIALOG_CONTENT: {},
  InfoDialog: () => null,
  InfoDialogContent: () => null,
}));

vi.mock("@/hooks", () => ({
  useDirection: () => ({ direction: "ltr" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "footer.contact" ? "Contact" : key),
  }),
}));

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the repository as a safe external link", () => {
    render(<Footer />);

    const repositoryLink = screen.getByRole("link", { name: /GitHub Repo/ });

    expect(repositoryLink).toHaveAttribute(
      "href",
      "https://github.com/dmaman86/shiftly",
    );
    expect(repositoryLink).toHaveAttribute("target", "_blank");
    expect(repositoryLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the email as a mailto link", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: /Contact/ })).toHaveAttribute(
      "href",
      "mailto:dmaman86@gmail.com",
    );
  });

  it.each([
    ["GitHub Repo", "github"],
    ["Contact", "email"],
  ] as const)("tracks clicks on the %s link", (accessibleName, target) => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: new RegExp(accessibleName) });
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(analyticsService.track).toHaveBeenCalledWith({
      name: "footer_link_clicked",
      params: { target },
    });
  });
});

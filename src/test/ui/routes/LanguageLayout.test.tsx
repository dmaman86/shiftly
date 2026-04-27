import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageLayout } from "@/app/routes/LanguageLayout";

vi.mock("@/i18n", () => ({
  default: { changeLanguage: vi.fn() },
}));

const mockSetDirection = vi.fn();

vi.mock("@/hooks", () => ({
  useDirection: () => ({ direction: "rtl", setDirection: mockSetDirection }),
}));

import i18n from "@/i18n";

const renderAtPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:lang" element={<LanguageLayout />}>
          <Route path="daily" element={<div>Page Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe("LanguageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Valid languages", () => {
    it("renders outlet content for 'he'", () => {
      renderAtPath("/he/daily");
      expect(screen.getByText("Page Content")).toBeInTheDocument();
    });

    it("renders outlet content for 'en'", () => {
      renderAtPath("/en/daily");
      expect(screen.getByText("Page Content")).toBeInTheDocument();
    });

    it("calls setDirection with 'rtl' for 'he'", () => {
      renderAtPath("/he/daily");
      expect(mockSetDirection).toHaveBeenCalledWith("rtl");
    });

    it("calls setDirection with 'ltr' for 'en'", () => {
      renderAtPath("/en/daily");
      expect(mockSetDirection).toHaveBeenCalledWith("ltr");
    });

    it("calls i18n.changeLanguage with 'he'", () => {
      renderAtPath("/he/daily");
      expect(i18n.changeLanguage).toHaveBeenCalledWith("he");
    });

    it("calls i18n.changeLanguage with 'en'", () => {
      renderAtPath("/en/daily");
      expect(i18n.changeLanguage).toHaveBeenCalledWith("en");
    });
  });

  describe("Invalid language", () => {
    it("redirects and eventually renders content at /he/daily", () => {
      renderAtPath("/fr/daily");
      expect(screen.getByText("Page Content")).toBeInTheDocument();
    });

    it("never calls i18n.changeLanguage with the invalid lang", () => {
      renderAtPath("/fr/daily");
      expect(i18n.changeLanguage).not.toHaveBeenCalledWith("fr");
    });

    it("never calls setDirection with ltr for invalid lang", () => {
      renderAtPath("/fr/daily");
      expect(mockSetDirection).not.toHaveBeenCalledWith("ltr");
    });
  });
});

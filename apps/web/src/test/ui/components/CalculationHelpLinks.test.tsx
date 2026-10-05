import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { CalculationHelpLinks } from "@/features/calculation-rules/CalculationHelpLinks";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/services", () => ({ analyticsService: { track } }));

describe("CalculationHelpLinks", () => {
  beforeEach(() => track.mockClear());

  it.each(["daily", "monthly"] as const)(
    "shows three direct links and tracks their source in %s",
    (source) => {
      render(
        <MemoryRouter initialEntries={[`/he/${source}`]}>
          <Routes>
            <Route path="/:lang" element={<Outlet />}>
              <Route
                path=":page"
                element={<CalculationHelpLinks source={source} />}
              />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText(/להבנת החישוב:/)).toBeInTheDocument();
      expect(screen.getAllByRole("link")).toHaveLength(3);
      expect(screen.getByRole("link", { name: "כללי החישוב" })).toHaveAttribute(
        "href",
        "/he/calculation-rules",
      );
      const example = screen.getByRole("link", { name: "דוגמה אינטראקטיבית" });
      const demo = screen.getByRole("link", { name: "סרטון הדגמה" });
      expect(example).toHaveAttribute(
        "href",
        "/he/calculation-rules#interactive-example",
      );
      expect(demo).toHaveAttribute("href", "/he/calculation-rules#demo");
      fireEvent.click(example);
      fireEvent.click(demo);
      expect(track).toHaveBeenCalledWith({
        name: "calculation_example_link_clicked",
        params: { source },
      });
      expect(track).toHaveBeenCalledWith({
        name: "calculation_demo_link_clicked",
        params: { source },
      });
    },
  );
});

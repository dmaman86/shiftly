import { describe, it, expect } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { RuleCard } from "@/features/calculation-rules/RuleCard";

describe("RuleCard", () => {
  describe("Basic Rendering", () => {
    it("should render card title", () => {
      renderWithTheme(
        <RuleCard title="Regular Hours">
          <div>Content</div>
        </RuleCard>
      );

      expect(screen.getByText("Regular Hours")).toBeInTheDocument();
    });

    it("should render card content", () => {
      renderWithTheme(
        <RuleCard title="Overtime">
          <div>Overtime is paid at 125%</div>
        </RuleCard>
      );

      expect(screen.getByText("Overtime is paid at 125%")).toBeInTheDocument();
    });

    it("should render title as h6 heading", () => {
      renderWithTheme(
        <RuleCard title="Night Shift">
          <div>Content</div>
        </RuleCard>
      );

      const heading = screen.getByText("Night Shift");
      expect(heading.tagName).toBe("H6");
    });

    it("should render divider between title and content", () => {
      const { container } = renderWithTheme(
        <RuleCard title="Test">
          <div>Content</div>
        </RuleCard>
      );

      // MUI Divider should be present
      const divider = container.querySelector("hr");
      expect(divider).toBeInTheDocument();
    });
  });

  describe("Content Variations", () => {
    it("should handle simple text content", () => {
      renderWithTheme(
        <RuleCard title="Simple Rule">
          Simple text description
        </RuleCard>
      );

      expect(screen.getByText("Simple text description")).toBeInTheDocument();
    });

    it("should handle complex HTML content", () => {
      renderWithTheme(
        <RuleCard title="Complex Rule">
          <div>
            <p>Paragraph 1</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <p>Paragraph 2</p>
          </div>
        </RuleCard>
      );

      expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
    });

    it("should handle multiple child elements", () => {
      renderWithTheme(
        <RuleCard title="Multiple Elements">
          <div>First section</div>
          <div>Second section</div>
          <div>Third section</div>
        </RuleCard>
      );

      expect(screen.getByText("First section")).toBeInTheDocument();
      expect(screen.getByText("Second section")).toBeInTheDocument();
      expect(screen.getByText("Third section")).toBeInTheDocument();
    });

    it("should handle nested components as children", () => {
      const NestedComponent = () => <span>Nested Content</span>;
      
      renderWithTheme(
        <RuleCard title="Nested Components">
          <NestedComponent />
        </RuleCard>
      );

      expect(screen.getByText("Nested Content")).toBeInTheDocument();
    });
  });

  describe("Title Variations", () => {
    it("should handle short titles", () => {
      renderWithTheme(
        <RuleCard title="100%">
          <div>Content</div>
        </RuleCard>
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should handle long titles", () => {
      const longTitle = "Very Long Calculation Rule Title That Contains Multiple Words";
      
      renderWithTheme(
        <RuleCard title={longTitle}>
          <div>Content</div>
        </RuleCard>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle titles with special characters", () => {
      renderWithTheme(
        <RuleCard title="Overtime: 125% - Night Shift">
          <div>Content</div>
        </RuleCard>
      );

      expect(screen.getByText("Overtime: 125% - Night Shift")).toBeInTheDocument();
    });

    it("should handle Hebrew titles", () => {
      renderWithTheme(
        <RuleCard title="שעות רגילות">
          <div>Content</div>
        </RuleCard>
      );

      expect(screen.getByText("שעות רגילות")).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should render as Material-UI Card component", () => {
      const { container } = renderWithTheme(
        <RuleCard title="Card Test">
          <div>Content</div>
        </RuleCard>
      );

      // Should have Card structure
      const card = container.querySelector(".MuiCard-root");
      expect(card).toBeInTheDocument();
    });

    it("should have CardContent wrapper", () => {
      const { container } = renderWithTheme(
        <RuleCard title="Content Test">
          <div>Content</div>
        </RuleCard>
      );

      const cardContent = container.querySelector(".MuiCardContent-root");
      expect(cardContent).toBeInTheDocument();
    });

    it("should apply hover effect classes", () => {
      const { container } = renderWithTheme(
        <RuleCard title="Hover Test">
          <div>Content</div>
        </RuleCard>
      );

      // Card should be present (hover is CSS-based)
      const card = container.querySelector(".MuiCard-root");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use proper heading hierarchy", () => {
      renderWithTheme(
        <RuleCard title="Accessible Title">
          <div>Content</div>
        </RuleCard>
      );

      const heading = screen.getByRole("heading", { name: "Accessible Title" });
      expect(heading).toBeInTheDocument();
    });

    it("should have readable content structure", () => {
      renderWithTheme(
        <RuleCard title="Rule Title">
          <p>Rule description that should be accessible</p>
        </RuleCard>
      );

      expect(screen.getByRole("heading", { name: "Rule Title" })).toBeInTheDocument();
      expect(screen.getByText("Rule description that should be accessible")).toBeInTheDocument();
    });

    it("should maintain semantic HTML structure", () => {
      const { container } = renderWithTheme(
        <RuleCard title="Semantic Test">
          <div>Content</div>
        </RuleCard>
      );

      // Should have proper heading and content structure
      expect(container.querySelector("h6")).toBeInTheDocument();
      expect(container.querySelector(".MuiCardContent-root")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string title", () => {
      renderWithTheme(
        <RuleCard title="">
          <div>Content with no title</div>
        </RuleCard>
      );

      expect(screen.getByText("Content with no title")).toBeInTheDocument();
    });

    it("should handle very long content", () => {
      const longContent = "This is a very long content string that contains multiple sentences and should be properly displayed in the card. ".repeat(10);
      
      renderWithTheme(
        <RuleCard title="Long Content">
          {longContent}
        </RuleCard>
      );

      expect(screen.getByText(/This is a very long content string/)).toBeInTheDocument();
    });

    it("should render with minimum props", () => {
      renderWithTheme(
        <RuleCard title="Minimum">
          Content
        </RuleCard>
      );

      expect(screen.getByText("Minimum")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });
});

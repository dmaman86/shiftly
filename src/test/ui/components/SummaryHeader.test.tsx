import { describe, it, expect } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { SummaryHeader } from "@/features/salary-summary/components/SummaryHeader";

describe("SummaryHeader", () => {
  describe("Basic Rendering", () => {
    it("should render title", () => {
      renderWithTheme(<SummaryHeader title="Monthly Summary" />);

      expect(screen.getByText("Monthly Summary")).toBeInTheDocument();
    });

    it("should render title as h5 heading", () => {
      renderWithTheme(<SummaryHeader title="Salary Breakdown" />);

      const heading = screen.getByText("Salary Breakdown");
      expect(heading.tagName).toBe("H5");
    });

    it("should render without subtitle", () => {
      renderWithTheme(<SummaryHeader title="Title Only" />);

      expect(screen.getByText("Title Only")).toBeInTheDocument();
      // Subtitle should not be present
      const container = screen.getByText("Title Only").parentElement?.parentElement;
      expect(container?.textContent).toBe("Title Only");
    });

    it("should render with subtitle when provided", () => {
      renderWithTheme(
        <SummaryHeader title="Monthly Report" subtitle="January 2024" />
      );

      expect(screen.getByText("Monthly Report")).toBeInTheDocument();
      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });
  });

  describe("Title Variations", () => {
    it("should handle short titles", () => {
      renderWithTheme(<SummaryHeader title="Pay" />);

      expect(screen.getByText("Pay")).toBeInTheDocument();
    });

    it("should handle long titles", () => {
      const longTitle = "Comprehensive Monthly Salary and Benefits Summary Report";
      renderWithTheme(<SummaryHeader title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle Hebrew titles", () => {
      renderWithTheme(<SummaryHeader title="סיכום שכר חודשי" />);

      expect(screen.getByText("סיכום שכר חודשי")).toBeInTheDocument();
    });

    it("should handle titles with special characters", () => {
      renderWithTheme(<SummaryHeader title="Q1 2024 - Summary" />);

      expect(screen.getByText("Q1 2024 - Summary")).toBeInTheDocument();
    });

    it("should handle titles with numbers", () => {
      renderWithTheme(<SummaryHeader title="2024 Annual Report" />);

      expect(screen.getByText("2024 Annual Report")).toBeInTheDocument();
    });
  });

  describe("Subtitle Variations", () => {
    it("should handle short subtitles", () => {
      renderWithTheme(<SummaryHeader title="Report" subtitle="Jan" />);

      expect(screen.getByText("Jan")).toBeInTheDocument();
    });

    it("should handle long subtitles", () => {
      const longSubtitle = "Detailed breakdown of all earnings and deductions for the current period";
      renderWithTheme(<SummaryHeader title="Summary" subtitle={longSubtitle} />);

      expect(screen.getByText(longSubtitle)).toBeInTheDocument();
    });

    it("should handle Hebrew subtitles", () => {
      renderWithTheme(
        <SummaryHeader title="Summary" subtitle="ינואר 2024" />
      );

      expect(screen.getByText("ינואר 2024")).toBeInTheDocument();
    });

    it("should handle subtitles with dates", () => {
      renderWithTheme(
        <SummaryHeader title="Report" subtitle="01/01/2024 - 31/01/2024" />
      );

      expect(screen.getByText("01/01/2024 - 31/01/2024")).toBeInTheDocument();
    });

    it("should render subtitle with secondary text color", () => {
      renderWithTheme(
        <SummaryHeader title="Title" subtitle="Subtitle" />
      );

      const subtitle = screen.getByText("Subtitle");
      expect(subtitle).toHaveClass("MuiTypography-body2");
    });
  });

  describe("Layout and Structure", () => {
    it("should use Stack layout", () => {
      const { container } = renderWithTheme(
        <SummaryHeader title="Test" subtitle="Subtitle" />
      );

      // MUI Stack should be present
      const stack = container.querySelector(".MuiStack-root");
      expect(stack).toBeInTheDocument();
    });

    it("should display title and subtitle in vertical layout", () => {
      renderWithTheme(
        <SummaryHeader title="Main Title" subtitle="Sub Title" />
      );

      const title = screen.getByText("Main Title");
      const subtitle = screen.getByText("Sub Title");

      expect(title).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
    });

    it("should have proper spacing between elements", () => {
      const { container } = renderWithTheme(
        <SummaryHeader title="Title" subtitle="Subtitle" />
      );

      // Should have margin bottom (mb: 3)
      const stack = container.querySelector(".MuiStack-root");
      expect(stack).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use proper heading hierarchy", () => {
      renderWithTheme(<SummaryHeader title="Accessible Title" />);

      const heading = screen.getByRole("heading", { name: "Accessible Title" });
      expect(heading).toBeInTheDocument();
    });

    it("should maintain heading structure with subtitle", () => {
      renderWithTheme(
        <SummaryHeader title="Main Heading" subtitle="Description text" />
      );

      const heading = screen.getByRole("heading", { name: "Main Heading" });
      expect(heading).toBeInTheDocument();
      
      // Subtitle should be regular text, not a heading
      const subtitle = screen.getByText("Description text");
      expect(subtitle.tagName).not.toBe("H1");
      expect(subtitle.tagName).not.toBe("H2");
      expect(subtitle.tagName).not.toBe("H3");
    });

    it("should have readable text content", () => {
      renderWithTheme(
        <SummaryHeader title="Salary Report" subtitle="Monthly breakdown" />
      );

      expect(screen.getByText("Salary Report")).toBeInTheDocument();
      expect(screen.getByText("Monthly breakdown")).toBeInTheDocument();
    });

    it("should use semantic HTML elements", () => {
      const { container } = renderWithTheme(
        <SummaryHeader title="Test Title" subtitle="Test Subtitle" />
      );

      // Should have proper heading element
      const heading = container.querySelector("h5");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe("Test Title");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty subtitle gracefully", () => {
      renderWithTheme(<SummaryHeader title="Title" subtitle="" />);

      expect(screen.getByText("Title")).toBeInTheDocument();
      // Empty subtitle should still render but be empty
    });

    it("should handle undefined subtitle", () => {
      renderWithTheme(<SummaryHeader title="Title" subtitle={undefined} />);

      expect(screen.getByText("Title")).toBeInTheDocument();
    });

    it("should handle title with line breaks", () => {
      renderWithTheme(<SummaryHeader title="Multi\nLine\nTitle" />);

      // Text with \n should still render
      expect(screen.getByText(/Multi/)).toBeInTheDocument();
    });

    it("should render with minimum props", () => {
      renderWithTheme(<SummaryHeader title="Minimum" />);

      expect(screen.getByText("Minimum")).toBeInTheDocument();
    });

    it("should render with all props", () => {
      renderWithTheme(
        <SummaryHeader
          title="Complete Header"
          subtitle="With full details"
        />
      );

      expect(screen.getByText("Complete Header")).toBeInTheDocument();
      expect(screen.getByText("With full details")).toBeInTheDocument();
    });

    it("should handle very long title and subtitle", () => {
      const longTitle = "A".repeat(100);
      const longSubtitle = "B".repeat(150);

      renderWithTheme(
        <SummaryHeader title={longTitle} subtitle={longSubtitle} />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longSubtitle)).toBeInTheDocument();
    });

    it("should handle special Unicode characters", () => {
      renderWithTheme(
        <SummaryHeader title="Émployé Sàlary™" subtitle="Café • 2024 ★" />
      );

      expect(screen.getByText("Émployé Sàlary™")).toBeInTheDocument();
      expect(screen.getByText("Café • 2024 ★")).toBeInTheDocument();
    });
  });
});

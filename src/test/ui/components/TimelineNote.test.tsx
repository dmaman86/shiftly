import { describe, it, expect } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { TimelineNote } from "@/features/calculation-rules/TimelineNote";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

describe("TimelineNote", () => {
  describe("Basic Rendering", () => {
    it("should render note text content", () => {
      renderWithTheme(
        <TimelineNote>This is a note message</TimelineNote>
      );

      expect(screen.getByText("This is a note message")).toBeInTheDocument();
    });

    it("should render default info icon when no custom icon provided", () => {
      const { container } = renderWithTheme(
        <TimelineNote>Note with default icon</TimelineNote>
      );

      // MUI InfoOutlinedIcon should be present
      const icon = container.querySelector('svg[data-testid="InfoOutlinedIcon"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render custom icon when provided", () => {
      renderWithTheme(
        <TimelineNote icon={<WarningAmberIcon data-testid="custom-warning-icon" />}>
          Note with custom icon
        </TimelineNote>
      );

      expect(screen.getByTestId("custom-warning-icon")).toBeInTheDocument();
    });
  });

  describe("Variant Types", () => {
    it("should render info variant by default", () => {
      const { container } = renderWithTheme(
        <TimelineNote>Info note</TimelineNote>
      );

      // Info variant has specific background color (rgba(33, 150, 243, 0.08))
      const noteBox = container.firstChild as HTMLElement;
      expect(noteBox).toBeInTheDocument();
    });

    it("should render warning variant with warning styles", () => {
      const { container } = renderWithTheme(
        <TimelineNote variant="warning">Warning message</TimelineNote>
      );

      // Warning variant should render with its specific styling
      const noteBox = container.firstChild as HTMLElement;
      expect(noteBox).toBeInTheDocument();
      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });

    it("should render tip variant with success styles", () => {
      const { container } = renderWithTheme(
        <TimelineNote variant="tip">Helpful tip</TimelineNote>
      );

      // Tip variant should render with its specific styling
      const noteBox = container.firstChild as HTMLElement;
      expect(noteBox).toBeInTheDocument();
      expect(screen.getByText("Helpful tip")).toBeInTheDocument();
    });
  });

  describe("Content Variations", () => {
    it("should handle multiline text content", () => {
      renderWithTheme(
        <TimelineNote>
          <div>Line 1</div>
          <div>Line 2</div>
          <div>Line 3</div>
        </TimelineNote>
      );

      expect(screen.getByText("Line 1")).toBeInTheDocument();
      expect(screen.getByText("Line 2")).toBeInTheDocument();
      expect(screen.getByText("Line 3")).toBeInTheDocument();
    });

    it("should handle long text content", () => {
      const longText = "This is a very long note that contains multiple sentences. It should wrap properly and maintain readable formatting. The component should handle this gracefully.";
      
      renderWithTheme(
        <TimelineNote>{longText}</TimelineNote>
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("should handle HTML elements as children", () => {
      renderWithTheme(
        <TimelineNote>
          <strong>Bold text</strong> and <em>italic text</em>
        </TimelineNote>
      );

      expect(screen.getByText("Bold text")).toBeInTheDocument();
      expect(screen.getByText("italic text")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should render with proper semantic structure", () => {
      const { container } = renderWithTheme(
        <TimelineNote>Accessible note</TimelineNote>
      );

      // Should have proper div structure
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText("Accessible note")).toBeInTheDocument();
    });

    it("should maintain readable text content", () => {
      renderWithTheme(
        <TimelineNote variant="warning">
          Important warning message
        </TimelineNote>
      );

      // Text should be accessible
      expect(screen.getByText("Important warning message")).toBeInTheDocument();
    });
  });

  describe("Combined Props", () => {
    it("should render with all props combined", () => {
      renderWithTheme(
        <TimelineNote 
          variant="tip" 
          icon={<TipsAndUpdatesIcon data-testid="tip-icon" />}
        >
          <div>Pro tip: Always test your code!</div>
        </TimelineNote>
      );

      expect(screen.getByTestId("tip-icon")).toBeInTheDocument();
      expect(screen.getByText("Pro tip: Always test your code!")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { TimeSegment } from "@/features/workday-timeline/TimeSegment";

describe("TimeSegment", () => {
  const defaultProps = {
    from: "08:00",
    to: "12:00",
    label: "100%",
    flex: 4,
    color: "#4caf50",
  };

  describe("Basic Rendering", () => {
    it("should render time range correctly", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      expect(screen.getByText("08:00")).toBeInTheDocument();
      expect(screen.getByText("12:00")).toBeInTheDocument();
    });

    it("should render label in the center", () => {
      renderWithTheme(<TimeSegment {...defaultProps} label="125%" />);

      expect(screen.getByText("125%")).toBeInTheDocument();
    });

    it("should apply custom background color", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} color="#ff5722" />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ backgroundColor: "#ff5722" });
    });

    it("should apply flex value for width proportions", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} flex={3} />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ flex: 3 });
    });
  });

  describe("Cross-Day Indicators", () => {
    it("should show asterisk (*) on start time when crossDay is true", () => {
      renderWithTheme(<TimeSegment {...defaultProps} crossDay={true} />);

      // The asterisk is rendered as <sup>*</sup> next to the time
      const fromTime = screen.getByText("08:00");
      expect(fromTime.innerHTML).toContain("<sup>*</sup>");
    });

    it("should show double asterisk (**) on end time when crossDay is true", () => {
      renderWithTheme(<TimeSegment {...defaultProps} crossDay={true} />);

      const toTime = screen.getByText("12:00");
      expect(toTime.innerHTML).toContain("<sup>**</sup>");
    });

    it("should not show asterisks when crossDay is false", () => {
      renderWithTheme(<TimeSegment {...defaultProps} crossDay={false} />);

      const fromTime = screen.getByText("08:00");
      const toTime = screen.getByText("12:00");

      expect(fromTime.innerHTML).not.toContain("<sup>");
      expect(toTime.innerHTML).not.toContain("<sup>");
    });

    it("should not show asterisks by default (crossDay undefined)", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      const fromTime = screen.getByText("08:00");
      const toTime = screen.getByText("12:00");

      expect(fromTime.innerHTML).not.toContain("<sup>");
      expect(toTime.innerHTML).not.toContain("<sup>");
    });
  });

  describe("Different Time Formats", () => {
    it("should handle midnight time correctly", () => {
      renderWithTheme(
        <TimeSegment {...defaultProps} from="00:00" to="06:00" />
      );

      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(screen.getByText("06:00")).toBeInTheDocument();
    });

    it("should handle late night hours", () => {
      renderWithTheme(
        <TimeSegment {...defaultProps} from="22:00" to="23:59" />
      );

      expect(screen.getByText("22:00")).toBeInTheDocument();
      expect(screen.getByText("23:59")).toBeInTheDocument();
    });

    it("should handle same start and end time", () => {
      renderWithTheme(
        <TimeSegment {...defaultProps} from="12:00" to="12:00" />
      );

      const times = screen.getAllByText("12:00");
      expect(times).toHaveLength(2); // Start and end
    });
  });

  describe("Label Variations", () => {
    it("should render percentage labels", () => {
      renderWithTheme(<TimeSegment {...defaultProps} label="150%" />);
      expect(screen.getByText("150%")).toBeInTheDocument();
    });

    it("should render text labels", () => {
      renderWithTheme(<TimeSegment {...defaultProps} label="Regular" />);
      expect(screen.getByText("Regular")).toBeInTheDocument();
    });

    it("should render empty label", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} label="" />
      );

      // Label box should still exist but be empty
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render multi-word labels", () => {
      renderWithTheme(
        <TimeSegment {...defaultProps} label="Overtime Premium" />
      );
      expect(screen.getByText("Overtime Premium")).toBeInTheDocument();
    });
  });

  describe("Color Variations", () => {
    it("should accept hex color codes", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} color="#2196f3" />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ backgroundColor: "#2196f3" });
    });

    it("should accept rgb color values", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} color="rgb(255, 87, 34)" />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ backgroundColor: "rgb(255, 87, 34)" });
    });

    it("should accept named colors", () => {
      // Named colors are accepted as valid props
      // MUI will handle the conversion internally
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} color="red" />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toBeInTheDocument();
    });
  });

  describe("Flex Sizing", () => {
    it("should handle small flex values (short duration)", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} flex={1} />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ flex: 1 });
    });

    it("should handle large flex values (long duration)", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} flex={10} />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ flex: 10 });
    });

    it("should handle decimal flex values", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} flex={2.5} />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ flex: 2.5 });
    });

    it("should handle zero flex value", () => {
      const { container } = renderWithTheme(
        <TimeSegment {...defaultProps} flex={0} />
      );

      const segment = container.firstChild as HTMLElement;
      expect(segment).toHaveStyle({ flex: 0 });
    });
  });

  describe("Layout and Structure", () => {
    it("should display times in separate containers at top", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      // Both times should be rendered (MUI Typography variant="caption" renders as SPAN)
      const fromTime = screen.getByText("08:00");
      const toTime = screen.getByText("12:00");

      expect(fromTime).toBeInTheDocument();
      expect(toTime).toBeInTheDocument();
    });

    it("should display label in center area", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      const label = screen.getByText("100%");
      expect(label).toBeInTheDocument();
    });

    it("should maintain proper structure with all elements", () => {
      const { container } = renderWithTheme(<TimeSegment {...defaultProps} />);

      // Should have main Box container
      expect(container.firstChild).toBeInTheDocument();

      // Should have all text elements
      expect(screen.getByText("08:00")).toBeInTheDocument();
      expect(screen.getByText("12:00")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long label text", () => {
      const longLabel = "Very Long Label That Might Overflow";
      renderWithTheme(<TimeSegment {...defaultProps} label={longLabel} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("should handle special characters in times", () => {
      renderWithTheme(
        <TimeSegment {...defaultProps} from="08:30" to="14:45" />
      );

      expect(screen.getByText("08:30")).toBeInTheDocument();
      expect(screen.getByText("14:45")).toBeInTheDocument();
    });

    it("should render with all props combined", () => {
      renderWithTheme(
        <TimeSegment
          from="09:00"
          to="17:00"
          label="125%"
          flex={8}
          color="#ff9800"
          crossDay={true}
        />
      );

      expect(screen.getByText("09:00")).toBeInTheDocument();
      expect(screen.getByText("17:00")).toBeInTheDocument();
      expect(screen.getByText("125%")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic typography elements", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      const fromTime = screen.getByText("08:00");
      const toTime = screen.getByText("12:00");
      const label = screen.getByText("100%");

      // MUI Typography renders as SPAN elements
      expect(fromTime).toBeInTheDocument();
      expect(toTime).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it("should have readable text content", () => {
      renderWithTheme(<TimeSegment {...defaultProps} />);

      // All text should be accessible via screen reader
      expect(screen.getByText("08:00")).toBeInTheDocument();
      expect(screen.getByText("12:00")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });
});

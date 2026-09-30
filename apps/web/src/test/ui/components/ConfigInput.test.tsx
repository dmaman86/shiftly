import { describe, it, expect, vi } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import userEvent from "@testing-library/user-event";
import { ConfigInput } from "@/features/config/ConfigInput";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

describe("ConfigInput", () => {
  const defaultProps = {
    name: "test-input",
    value: "",
    label: "Test Label",
    onChange: vi.fn(),
  };

  it("should render with label", () => {
    renderWithTheme(
      <ConfigInput {...defaultProps} label="Standard Hours" />
    );

    expect(screen.getByLabelText("Standard Hours")).toBeInTheDocument();
  });

  it("should display the provided value", () => {
    renderWithTheme(
      <ConfigInput {...defaultProps} value="42" />
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("42");
  });

  it("should call onChange when user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithTheme(
      <ConfigInput {...defaultProps} onChange={handleChange} />
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "123");

    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(handleChange).toHaveBeenCalledWith("1");
    expect(handleChange).toHaveBeenCalledWith("2");
    expect(handleChange).toHaveBeenCalledWith("3");
  });

  it("should call onBlur when input loses focus", async () => {
    const user = userEvent.setup();
    const handleBlur = vi.fn();

    renderWithTheme(
      <ConfigInput {...defaultProps} onBlur={handleBlur} />
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it("should display error state with helper text", () => {
    renderWithTheme(
      <ConfigInput
        {...defaultProps}
        error={true}
        helperText="This field is required"
      />
    );

    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    renderWithTheme(
      <ConfigInput {...defaultProps} disabled={true} />
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("should render with icon when provided", () => {
    renderWithTheme(
      <ConfigInput
        {...defaultProps}
        icon={<AttachMoneyIcon data-testid="money-icon" />}
      />
    );

    expect(screen.getByTestId("money-icon")).toBeInTheDocument();
  });

  it("should support number type input", () => {
    renderWithTheme(
      <ConfigInput {...defaultProps} type="number" />
    );

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
  });

  it("should support different variants", () => {
    const { rerender } = renderWithTheme(
      <ConfigInput {...defaultProps} variant="outlined" />
    );

    let input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    rerender(<ConfigInput {...defaultProps} variant="filled" />);
    input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    rerender(<ConfigInput {...defaultProps} variant="standard" />);
    input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("should have fullWidth property set", () => {
    renderWithTheme(<ConfigInput {...defaultProps} />);

    const input = screen.getByRole("textbox");
    // MUI applies fullWidth via parent div classes
    const parentDiv = input.closest(".MuiTextField-root");
    expect(parentDiv).toBeInTheDocument();
  });

  it("should not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithTheme(
      <ConfigInput
        {...defaultProps}
        disabled={true}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "test");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("should show helper text without error", () => {
    renderWithTheme(
      <ConfigInput
        {...defaultProps}
        helperText="Enter a positive number"
      />
    );

    expect(screen.getByText("Enter a positive number")).toBeInTheDocument();
  });
});

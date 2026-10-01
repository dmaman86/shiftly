import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NumberConfigInput } from "@/features/config/NumberConfigInput";

describe("NumberConfigInput draft commits", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not replay an old debounced zero after an external value change", async () => {
    const onChange = vi.fn();
    const input = (value: number) => <NumberConfigInput name="rate" label="Rate" value={value} onChange={onChange} />;
    const { rerender } = render(input(75));
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "0" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
    onChange.mockClear();
    rerender(input(60));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.getByLabelText("Rate")).toHaveValue(60);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels a pending draft when an external committed value changes", async () => {
    const onChange = vi.fn();
    const input = (value: number) => <NumberConfigInput name="rate" label="Rate" value={value} onChange={onChange} />;
    const { rerender } = render(input(75));
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "0" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    rerender(input(60));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not commit a previous debounced draft while a newer draft is unsettled", async () => {
    const onChange = vi.fn();
    render(<NumberConfigInput name="rate" label="Rate" value={75} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "60" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(60);
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "65" } });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(65);
  });
});

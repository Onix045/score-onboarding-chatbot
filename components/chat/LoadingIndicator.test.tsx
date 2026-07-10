import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingIndicator } from "./LoadingIndicator";

describe("LoadingIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a plain typing status immediately", () => {
    render(<LoadingIndicator />);
    expect(screen.getByRole("status", { name: "S.C.O.R.E. Guide is typing" })).toBeInTheDocument();
    expect(screen.queryByText(/still working/i)).not.toBeInTheDocument();
  });

  it("adds a reassuring note once the reply takes longer than a few seconds", () => {
    render(<LoadingIndicator />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole("status", { name: "Still working on your answer" })).toBeInTheDocument();
    expect(screen.getByText(/still working on it/i)).toBeInTheDocument();
  });
});

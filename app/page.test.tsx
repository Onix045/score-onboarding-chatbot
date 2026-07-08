import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the SCORE landing page hero and features", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /run your whole small business in one place/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Small business toolkit")).toBeInTheDocument();
    expect(screen.getByText("Everything you need to run the shop")).toBeInTheDocument();
  });

  it("renders the closed-state chat launcher", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /need help getting started/i })
    ).toBeInTheDocument();
  });
});

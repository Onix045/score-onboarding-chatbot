import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the S.C.O.R.E. product name and demonstration label", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "S.C.O.R.E." })).toBeInTheDocument();
    expect(screen.getByText("Demonstration")).toBeInTheDocument();
  });

  it("renders the closed-state chat launcher", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /need help getting started/i })
    ).toBeInTheDocument();
  });
});

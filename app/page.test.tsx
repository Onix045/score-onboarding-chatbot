import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("confirms the project is running", () => {
    render(<Home />);
    expect(screen.getByText(/project is up and running/i)).toBeInTheDocument();
  });
});

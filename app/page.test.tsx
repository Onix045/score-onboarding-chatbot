import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows starter questions together when the chat opens", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /need help getting started/i }));

    expect(screen.getByText("Try asking:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Where should I start?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What is inventory tracking?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How do I record a sale?" })).toBeInTheDocument();
  });
});

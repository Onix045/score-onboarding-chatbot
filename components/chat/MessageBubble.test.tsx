import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/lib/chat/types";

describe("MessageBubble", () => {
  it("renders a grounded assistant answer without a sources line or confirmation tag", () => {
    const message: ChatMessage = {
      id: "1",
      role: "assistant",
      text: "Inventory tracking keeps a running count of stock.",
      grounded: true,
      sources: [{ title: "Inventory tracking", category: "inventory" }],
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText(message.text)).toBeInTheDocument();
    expect(screen.queryByText(/Sources:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet confirmed")).not.toBeInTheDocument();
  });

  it("renders an unconfirmed fallback answer without a sources line or confirmation tag", () => {
    const message: ChatMessage = {
      id: "2",
      role: "assistant",
      text: "I don't have confirmed information about that feature yet.",
      grounded: false,
      sources: [],
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText(message.text)).toBeInTheDocument();
    expect(screen.queryByText(/Sources:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet confirmed")).not.toBeInTheDocument();
  });

  it("renders a plain user message without sources or confirmation state", () => {
    const message: ChatMessage = { id: "3", role: "user", text: "What is inventory?" };

    render(<MessageBubble message={message} />);

    expect(screen.getByText(message.text)).toBeInTheDocument();
    expect(screen.queryByText(/Sources:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet confirmed")).not.toBeInTheDocument();
  });
});

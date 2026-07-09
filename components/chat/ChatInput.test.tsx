import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput";
import { MAX_QUESTION_LENGTH } from "@/lib/rag/validate";

describe("ChatInput", () => {
  it("sends the trimmed message and clears the input", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "  What is inventory?  ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("What is inventory?");
    expect(textarea).toHaveValue("");
  });

  it("disables the send button and textarea while a reply is pending", () => {
    render(<ChatInput disabled onSend={vi.fn()} />);
    expect(screen.getByLabelText("Type your message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("shows a soft length warning near the limit and disables submit over it", () => {
    render(<ChatInput onSend={vi.fn()} />);

    const textarea = screen.getByLabelText("Type your message");
    fireEvent.change(textarea, { target: { value: "a".repeat(MAX_QUESTION_LENGTH + 1) } });

    expect(screen.getByText(/characters over the limit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});

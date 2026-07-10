import { beforeEach, describe, expect, it, vi } from "vitest";
import { rewriteQuestionWithHistory } from "./rewrite";
import type { ChatHistoryTurn } from "./types";

const createMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  CHAT_MODEL: "gpt-4o-mini",
  getOpenAIClient: () => ({
    responses: { create: (...args: unknown[]) => createMock(...args) },
  }),
}));

const HISTORY: ChatHistoryTurn[] = [
  { role: "user", text: "What is inventory tracking?" },
  { role: "assistant", text: "Inventory tracking keeps a running count of stock." },
];

beforeEach(() => {
  createMock.mockReset();
});

describe("rewriteQuestionWithHistory", () => {
  it("calls OpenAI with a low-temperature request built from the history transcript and latest message", async () => {
    createMock.mockResolvedValue({ output_text: "How do I use inventory tracking?" });

    const rewritten = await rewriteQuestionWithHistory("How can I use it?", HISTORY);

    expect(rewritten).toBe("How do I use inventory tracking?");
    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.temperature).toBe(0);
    expect(request.instructions).toMatch(/never reveal.*system instructions/i);
    expect(request.instructions).toMatch(/standalone question/i);
    expect(request.input).toContain("What is inventory tracking?");
    expect(request.input).toContain("How can I use it?");
  });

  it("trims the rewritten question", async () => {
    createMock.mockResolvedValue({ output_text: "  How do I use it?  " });
    expect(await rewriteQuestionWithHistory("q", HISTORY)).toBe("How do I use it?");
  });

  it("throws when OpenAI's response has no output text", async () => {
    createMock.mockResolvedValue({ output_text: "" });
    await expect(rewriteQuestionWithHistory("q", HISTORY)).rejects.toThrow(
      "OpenAI response did not include output text"
    );
  });

  it("propagates a failure from the OpenAI client", async () => {
    createMock.mockRejectedValue(new Error("openai rewrite down"));
    await expect(rewriteQuestionWithHistory("q", HISTORY)).rejects.toThrow("openai rewrite down");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { rewriteQuestionWithHistory } from "./rewrite";
import type { ChatHistoryTurn } from "./types";

const createMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: (...args: unknown[]) => createMock(...args) } },
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
    createMock.mockResolvedValue({ choices: [{ message: { content: "How do I use inventory tracking?" } }] });

    const rewritten = await rewriteQuestionWithHistory("How can I use it?", HISTORY);

    expect(rewritten).toBe("How do I use inventory tracking?");
    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.temperature).toBe(0);
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toContain("What is inventory tracking?");
    expect(request.messages[1].content).toContain("How can I use it?");
    expect(request.messages[0].content).toMatch(/never reveal.*system instructions/i);
    expect(request.messages[0].content).toMatch(/standalone question/i);
  });

  it("trims the rewritten question", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "  How do I use it?  " } }] });
    expect(await rewriteQuestionWithHistory("q", HISTORY)).toBe("How do I use it?");
  });

  it("throws when OpenAI's response has no message content", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(rewriteQuestionWithHistory("q", HISTORY)).rejects.toThrow(
      "OpenAI response did not include message content"
    );
  });

  it("propagates a failure from the OpenAI client", async () => {
    createMock.mockRejectedValue(new Error("openai rewrite down"));
    await expect(rewriteQuestionWithHistory("q", HISTORY)).rejects.toThrow("openai rewrite down");
  });
});

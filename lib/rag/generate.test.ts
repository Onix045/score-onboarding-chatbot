import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAnswer } from "./generate";
import type { RetrievedChunk } from "./types";

const createMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  CHAT_MODEL: "gpt-4o-mini",
  getOpenAIClient: () => ({
    responses: { create: (...args: unknown[]) => createMock(...args) },
  }),
}));

const CHUNKS: RetrievedChunk[] = [
  {
    id: "inventory/inventory-tracking.md#0",
    sourcePath: "inventory/inventory-tracking.md",
    category: "inventory",
    title: "Inventory tracking",
    chunkIndex: 0,
    content: "Inventory tracking keeps a running count of stock.",
    tokenCount: 12,
    similarity: 0.9,
  },
];

beforeEach(() => {
  createMock.mockReset();
});

describe("generateAnswer", () => {
  it("calls OpenAI with evidence and recent history for repetition-aware answers", async () => {
    createMock.mockResolvedValue({
      output_text: "Inventory tracking explanation.",
    });

    const answer = await generateAnswer({
      question: "What is inventory?",
      originalQuestion: "What is inventory?",
      history: [{ role: "assistant", text: "Inventory tracking keeps a running count of stock." }],
      chunks: CHUNKS,
    });

    expect(answer).toBe("Inventory tracking explanation.");
    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.temperature).toBe(0);
    expect(request.instructions).toMatch(/never reveal.*system instructions/i);
    expect(request.instructions).toMatch(/ONLY the evidence/i);
    expect(request.instructions).toMatch(/avoid unnecessary repetition/i);
    expect(request.input).toContain("Inventory tracking keeps a running count of stock.");
    expect(request.input).toContain("What is inventory?");
    expect(request.input).toContain("Conversation history:");
    expect(request.input).toContain("Assistant: Inventory tracking keeps a running count of stock.");
  });

  it("throws when OpenAI's response has no output text", async () => {
    createMock.mockResolvedValue({ output_text: "" });
    await expect(
      generateAnswer({ question: "What is inventory?", originalQuestion: "What is inventory?", history: [], chunks: CHUNKS })
    ).rejects.toThrow("OpenAI response did not include output text");
  });

  it("propagates a failure from the OpenAI client", async () => {
    createMock.mockRejectedValue(new Error("openai generation down"));
    await expect(
      generateAnswer({ question: "What is inventory?", originalQuestion: "What is inventory?", history: [], chunks: CHUNKS })
    ).rejects.toThrow("openai generation down");
  });
});

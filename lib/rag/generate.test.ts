import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAnswer } from "./generate";
import type { RetrievedChunk } from "./types";

const createMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: (...args: unknown[]) => createMock(...args) } },
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
  it("calls OpenAI with a stateless, low-temperature request built only from the evidence", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "Inventory tracking explanation." } }],
    });

    const answer = await generateAnswer("What is inventory?", CHUNKS);

    expect(answer).toBe("Inventory tracking explanation.");
    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.temperature).toBe(0);
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toContain("Inventory tracking keeps a running count of stock.");
    expect(request.messages[1].content).toContain("What is inventory?");
    expect(request.messages[0].content).toMatch(/never reveal.*system instructions/i);
    expect(request.messages[0].content).toMatch(/ONLY the evidence/);
  });

  it("throws when OpenAI's response has no message content", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(generateAnswer("What is inventory?", CHUNKS)).rejects.toThrow(
      "OpenAI response did not include message content"
    );
  });

  it("propagates a failure from the OpenAI client", async () => {
    createMock.mockRejectedValue(new Error("openai generation down"));
    await expect(generateAnswer("What is inventory?", CHUNKS)).rejects.toThrow("openai generation down");
  });
});

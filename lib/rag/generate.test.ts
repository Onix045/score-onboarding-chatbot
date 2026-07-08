import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAnswer } from "./generate";
import type { RetrievedChunk } from "./types";

const createMock = vi.fn();

vi.mock("@/lib/clients/anthropic", () => ({
  getAnthropicClient: () => ({
    messages: { create: (...args: unknown[]) => createMock(...args) },
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
  it("calls Claude with a stateless, low-temperature request built only from the evidence", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "Inventory tracking explanation." }] });

    const answer = await generateAnswer("What is inventory?", CHUNKS);

    expect(answer).toBe("Inventory tracking explanation.");
    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.temperature).toBe(0);
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].content).toContain("Inventory tracking keeps a running count of stock.");
    expect(request.messages[0].content).toContain("What is inventory?");
    expect(request.system).toMatch(/never reveal.*system instructions/i);
    expect(request.system).toMatch(/ONLY the evidence/);
  });

  it("throws when Claude's response has no text block", async () => {
    createMock.mockResolvedValue({ content: [{ type: "tool_use" }] });
    await expect(generateAnswer("What is inventory?", CHUNKS)).rejects.toThrow(
      "Claude response did not include a text block"
    );
  });

  it("propagates a failure from the Anthropic client", async () => {
    createMock.mockRejectedValue(new Error("anthropic down"));
    await expect(generateAnswer("What is inventory?", CHUNKS)).rejects.toThrow("anthropic down");
  });
});

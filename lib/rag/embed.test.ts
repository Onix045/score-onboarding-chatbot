import { beforeEach, describe, expect, it, vi } from "vitest";
import { embedQuery } from "./embed";

const embedTextsMock = vi.fn();

vi.mock("@/lib/clients/voyage", () => ({
  embedTexts: (texts: string[]) => embedTextsMock(texts),
}));

beforeEach(() => {
  embedTextsMock.mockReset();
});

describe("embedQuery", () => {
  it("embeds exactly the question text, never chat history", async () => {
    embedTextsMock.mockResolvedValue([[0.1, 0.2, 0.3]]);

    const embedding = await embedQuery("What is inventory?");

    expect(embedTextsMock).toHaveBeenCalledWith(["What is inventory?"]);
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it("propagates a failure from the Voyage client", async () => {
    embedTextsMock.mockRejectedValue(new Error("voyage down"));
    await expect(embedQuery("What is inventory?")).rejects.toThrow("voyage down");
  });
});

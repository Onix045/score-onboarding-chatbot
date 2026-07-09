import { beforeEach, describe, expect, it, vi } from "vitest";
import { embedQuery } from "./embed";

const embedTextsMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
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

  it("propagates a failure from the OpenAI client", async () => {
    embedTextsMock.mockRejectedValue(new Error("openai embeddings down"));
    await expect(embedQuery("What is inventory?")).rejects.toThrow("openai embeddings down");
  });

  it("normalizes the dotted acronym before embedding", async () => {
    embedTextsMock.mockResolvedValue([[0.1, 0.2, 0.3]]);

    await embedQuery("What is S.C.O.R.E.?");

    expect(embedTextsMock).toHaveBeenCalledWith(["What is SCORE?"]);
  });
});

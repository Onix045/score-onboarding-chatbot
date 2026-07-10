import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveChunksBySourcePath, retrieveRelevantChunks } from "./retrieve";

const searchMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  getOpenAIClient: () => ({
    vectorStores: { search: (...args: unknown[]) => searchMock(...args) },
  }),
  getRequiredVectorStoreId: () => "vs_test123",
}));

const SAMPLE_RESULTS = [
  {
    file_id: "file_inventory",
    filename: "inventory/inventory-tracking.md",
    score: 0.9,
    attributes: { sourcePath: "inventory/inventory-tracking.md", category: "inventory", title: "Inventory tracking" },
    content: [{ text: "Inventory tracking keeps a running count of stock.", type: "text" }],
  },
  {
    file_id: "file_inventory",
    filename: "inventory/inventory-tracking.md",
    score: 0.8,
    attributes: { sourcePath: "inventory/inventory-tracking.md", category: "inventory", title: "Inventory tracking" },
    content: [{ text: "Low-stock alerts let you know when to reorder.", type: "text" }],
  },
  {
    file_id: "file_faq",
    filename: "faq/common-questions.md",
    score: 0.75,
    attributes: { sourcePath: "faq/common-questions.md", category: "faq", title: "Frequently asked questions" },
    content: [{ text: "Borderline relevance chunk.", type: "text" }],
  },
  {
    file_id: "file_faq",
    filename: "faq/common-questions.md",
    score: 0.5,
    attributes: { sourcePath: "faq/common-questions.md", category: "faq", title: "Frequently asked questions" },
    content: [{ text: "Unrelated chunk.", type: "text" }],
  },
];

beforeEach(() => {
  searchMock.mockReset();
});

describe("retrieveRelevantChunks", () => {
  it("clamps a requested match count above the hard ceiling to 4", async () => {
    searchMock.mockResolvedValue({ data: [] });

    await retrieveRelevantChunks({ query: "what is inventory?", similarityThreshold: 0.75, maxChunks: 10 });

    expect(searchMock).toHaveBeenCalledWith(
      "vs_test123",
      expect.objectContaining({ max_num_results: 4 })
    );
  });

  it("passes the query through to the search call", async () => {
    searchMock.mockResolvedValue({ data: [] });

    await retrieveRelevantChunks({ query: "what is inventory?", similarityThreshold: 0.75, maxChunks: 4 });

    expect(searchMock).toHaveBeenCalledWith("vs_test123", {
      query: "what is inventory?",
      max_num_results: 4,
      ranking_options: { score_threshold: 0.75 },
    });
  });

  it("re-applies the similarity threshold in TypeScript, discarding results at or below it", async () => {
    searchMock.mockResolvedValue({ data: SAMPLE_RESULTS });

    const chunks = await retrieveRelevantChunks({
      query: "what is inventory?",
      similarityThreshold: 0.75,
      maxChunks: 4,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => chunk.similarity)).toEqual([0.9, 0.8]);
  });

  it("maps search results onto RetrievedChunk correctly using file attributes", async () => {
    searchMock.mockResolvedValue({ data: [SAMPLE_RESULTS[0]] });

    const [chunk] = await retrieveRelevantChunks({
      query: "what is inventory?",
      similarityThreshold: 0.5,
      maxChunks: 4,
    });

    expect(chunk).toEqual({
      id: "file_inventory#0",
      sourcePath: "inventory/inventory-tracking.md",
      category: "inventory",
      title: "Inventory tracking",
      chunkIndex: 0,
      content: "Inventory tracking keeps a running count of stock.",
      tokenCount: 13,
      similarity: 0.9,
    });
  });

  it("propagates a failure from the OpenAI client", async () => {
    searchMock.mockRejectedValue(new Error("connection refused"));

    await expect(
      retrieveRelevantChunks({ query: "what is inventory?", similarityThreshold: 0.75, maxChunks: 4 })
    ).rejects.toThrow("connection refused");
  });

  it("clamps invalid configuration to safe API bounds", async () => {
    searchMock.mockResolvedValue({ data: [] });

    await retrieveRelevantChunks({
      query: "what is inventory?",
      similarityThreshold: 9,
      maxChunks: 0,
    });

    expect(searchMock).toHaveBeenCalledWith(
      "vs_test123",
      expect.objectContaining({
        max_num_results: 1,
        ranking_options: { score_threshold: 1 },
      })
    );
  });

  it("rejects search results with invalid citation metadata", async () => {
    searchMock.mockResolvedValue({
      data: [{ ...SAMPLE_RESULTS[0], attributes: { category: "unknown" } }],
    });

    await expect(
      retrieveRelevantChunks({
        query: "what is inventory?",
        similarityThreshold: 0.5,
        maxChunks: 4,
      })
    ).rejects.toThrow(/invalid category/);
  });
});

describe("retrieveChunksBySourcePath", () => {
  const RESULTS = [
    {
      file_id: "file_limitations",
      filename: "limitations/unsupported-features.md",
      score: 0.42,
      attributes: {
        sourcePath: "limitations/unsupported-features.md",
        category: "limitations",
        title: "Features we can't confirm yet",
      },
      content: [{ text: "Pricing and plans: I don't have confirmed information about that feature yet.", type: "text" }],
    },
    {
      file_id: "file_limitations",
      filename: "limitations/unsupported-features.md",
      score: 0.31,
      attributes: {
        sourcePath: "limitations/unsupported-features.md",
        category: "limitations",
        title: "Features we can't confirm yet",
      },
      content: [{ text: "Offline support: I don't have confirmed information about that feature yet.", type: "text" }],
    },
  ];

  it("filters by exact sourcePath attribute, with no similarity threshold applied", async () => {
    searchMock.mockResolvedValue({ data: RESULTS });

    await retrieveChunksBySourcePath("limitations/unsupported-features.md");

    expect(searchMock).toHaveBeenCalledWith(
      "vs_test123",
      expect.objectContaining({
        filters: { key: "sourcePath", type: "eq", value: "limitations/unsupported-features.md" },
      })
    );
  });

  it("maps every result onto RetrievedChunk, keeping the vector store's own score", async () => {
    searchMock.mockResolvedValue({ data: RESULTS });

    const chunks = await retrieveChunksBySourcePath("limitations/unsupported-features.md");

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      id: "file_limitations#0",
      sourcePath: "limitations/unsupported-features.md",
      category: "limitations",
      title: "Features we can't confirm yet",
      chunkIndex: 0,
      content: "Pricing and plans: I don't have confirmed information about that feature yet.",
      tokenCount: 20,
      similarity: 0.42,
    });
  });

  it("returns an empty array when no results match", async () => {
    searchMock.mockResolvedValue({ data: [] });
    expect(await retrieveChunksBySourcePath("nonexistent.md")).toEqual([]);
  });

  it("propagates a failure from the OpenAI client", async () => {
    searchMock.mockRejectedValue(new Error("connection refused"));
    await expect(retrieveChunksBySourcePath("limitations/unsupported-features.md")).rejects.toThrow(
      "connection refused"
    );
  });
});

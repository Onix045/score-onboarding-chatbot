import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveChunksBySourcePath, retrieveRelevantChunks } from "./retrieve";

const rpcMock = vi.fn();
const orderMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

eqMock.mockReturnValue({ order: orderMock });
selectMock.mockReturnValue({ eq: eqMock });
fromMock.mockReturnValue({ select: selectMock });

vi.mock("@/lib/clients/supabase", () => ({
  getSupabaseServiceRoleClient: () => ({
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  }),
}));

const SAMPLE_ROWS = [
  {
    id: "inventory/inventory-tracking.md#0",
    source_path: "inventory/inventory-tracking.md",
    category: "inventory",
    title: "Inventory tracking",
    chunk_index: 0,
    content: "Inventory tracking keeps a running count of stock.",
    token_count: 12,
    similarity: 0.9,
  },
  {
    id: "inventory/inventory-tracking.md#1",
    source_path: "inventory/inventory-tracking.md",
    category: "inventory",
    title: "Inventory tracking",
    chunk_index: 1,
    content: "Low-stock alerts let you know when to reorder.",
    token_count: 10,
    similarity: 0.8,
  },
  {
    id: "faq/common-questions.md#0",
    source_path: "faq/common-questions.md",
    category: "faq",
    title: "Frequently asked questions",
    chunk_index: 0,
    content: "Borderline relevance chunk.",
    token_count: 5,
    similarity: 0.75,
  },
  {
    id: "faq/common-questions.md#1",
    source_path: "faq/common-questions.md",
    category: "faq",
    title: "Frequently asked questions",
    chunk_index: 1,
    content: "Unrelated chunk.",
    token_count: 4,
    similarity: 0.5,
  },
];

beforeEach(() => {
  rpcMock.mockReset();
  orderMock.mockReset();
  eqMock.mockClear();
  selectMock.mockClear();
  fromMock.mockClear();
});

describe("retrieveRelevantChunks", () => {
  it("clamps a requested match count above the hard ceiling to 4", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await retrieveRelevantChunks({ queryEmbedding: [0.1], similarityThreshold: 0.75, maxChunks: 10 });

    expect(rpcMock).toHaveBeenCalledWith(
      "match_document_chunks",
      expect.objectContaining({ match_count: 4 })
    );
  });

  it("passes the query embedding and threshold through to the RPC call", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await retrieveRelevantChunks({ queryEmbedding: [0.1, 0.2], similarityThreshold: 0.75, maxChunks: 4 });

    expect(rpcMock).toHaveBeenCalledWith("match_document_chunks", {
      query_embedding: [0.1, 0.2],
      match_threshold: 0.75,
      match_count: 4,
    });
  });

  it("re-applies the similarity threshold in TypeScript, discarding rows at or below it", async () => {
    rpcMock.mockResolvedValue({ data: SAMPLE_ROWS, error: null });

    const chunks = await retrieveRelevantChunks({
      queryEmbedding: [0.1],
      similarityThreshold: 0.75,
      maxChunks: 4,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => chunk.similarity)).toEqual([0.9, 0.8]);
  });

  it("maps row fields onto RetrievedChunk correctly", async () => {
    rpcMock.mockResolvedValue({ data: [SAMPLE_ROWS[0]], error: null });

    const [chunk] = await retrieveRelevantChunks({
      queryEmbedding: [0.1],
      similarityThreshold: 0.5,
      maxChunks: 4,
    });

    expect(chunk).toEqual({
      id: "inventory/inventory-tracking.md#0",
      sourcePath: "inventory/inventory-tracking.md",
      category: "inventory",
      title: "Inventory tracking",
      chunkIndex: 0,
      content: "Inventory tracking keeps a running count of stock.",
      tokenCount: 12,
      similarity: 0.9,
    });
  });

  it("throws a descriptive error when the RPC call fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    await expect(
      retrieveRelevantChunks({ queryEmbedding: [0.1], similarityThreshold: 0.75, maxChunks: 4 })
    ).rejects.toThrow(/Retrieval failed/);
  });
});

describe("retrieveChunksBySourcePath", () => {
  const ROWS = [
    {
      id: "limitations/unsupported-features.md#0",
      source_path: "limitations/unsupported-features.md",
      category: "limitations",
      title: "Features we can't confirm yet",
      chunk_index: 0,
      content: "Pricing and plans: I don't have confirmed information about that feature yet.",
      token_count: 15,
    },
    {
      id: "limitations/unsupported-features.md#1",
      source_path: "limitations/unsupported-features.md",
      category: "limitations",
      title: "Features we can't confirm yet",
      chunk_index: 1,
      content: "Offline support: I don't have confirmed information about that feature yet.",
      token_count: 14,
    },
  ];

  it("queries by exact source_path, ordered by chunk_index, with no embedding or threshold involved", async () => {
    orderMock.mockResolvedValue({ data: ROWS, error: null });

    await retrieveChunksBySourcePath("limitations/unsupported-features.md");

    expect(fromMock).toHaveBeenCalledWith("document_chunks");
    expect(eqMock).toHaveBeenCalledWith("source_path", "limitations/unsupported-features.md");
    expect(orderMock).toHaveBeenCalledWith("chunk_index", { ascending: true });
  });

  it("maps every row onto RetrievedChunk with similarity fixed at 1", async () => {
    orderMock.mockResolvedValue({ data: ROWS, error: null });

    const chunks = await retrieveChunksBySourcePath("limitations/unsupported-features.md");

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      id: "limitations/unsupported-features.md#0",
      sourcePath: "limitations/unsupported-features.md",
      category: "limitations",
      title: "Features we can't confirm yet",
      chunkIndex: 0,
      content: "Pricing and plans: I don't have confirmed information about that feature yet.",
      tokenCount: 15,
      similarity: 1,
    });
    expect(chunks.every((chunk) => chunk.similarity === 1)).toBe(true);
  });

  it("returns an empty array when no rows match", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });
    expect(await retrieveChunksBySourcePath("nonexistent.md")).toEqual([]);
  });

  it("throws a descriptive error when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    await expect(retrieveChunksBySourcePath("limitations/unsupported-features.md")).rejects.toThrow(
      /Retrieval failed/
    );
  });
});

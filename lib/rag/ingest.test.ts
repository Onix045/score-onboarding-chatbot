import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildChunksForFile, embedChunks, ingestKnowledgeBase, listMarkdownFiles } from "./ingest";
import type { DocumentChunk } from "./types";

const embedTextsMock = vi.fn();
const deleteEqMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  embedTexts: (texts: string[]) => embedTextsMock(texts),
}));

vi.mock("@/lib/clients/supabase", () => ({
  getSupabaseServiceRoleClient: () => ({
    from: (table: string) => fromMock(table),
  }),
}));

const KNOWLEDGE_ROOT = join(process.cwd(), "content", "knowledge");

beforeEach(() => {
  embedTextsMock.mockReset();
  deleteEqMock.mockReset();
  insertMock.mockReset();
  fromMock.mockReset();

  embedTextsMock.mockImplementation(async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]));
  deleteEqMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
  fromMock.mockImplementation(() => ({
    delete: () => ({ eq: deleteEqMock }),
    insert: insertMock,
  }));
});

describe("listMarkdownFiles", () => {
  it("finds every knowledge markdown file across all categories", () => {
    const files = listMarkdownFiles(KNOWLEDGE_ROOT);
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(files.every((file) => file.endsWith(".md"))).toBe(true);
  });
});

describe("buildChunksForFile", () => {
  it("parses frontmatter and chunks a real knowledge file", () => {
    const filePath = join(KNOWLEDGE_ROOT, "inventory", "inventory-tracking.md");
    const rawContent = readFileSync(filePath, "utf8");

    const chunks = buildChunksForFile(rawContent, filePath, KNOWLEDGE_ROOT);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].sourcePath).toBe("inventory/inventory-tracking.md");
    expect(chunks[0].category).toBe("inventory");
    expect(chunks[0].title).toBe("Inventory tracking");
  });
});

describe("embedChunks", () => {
  it("normalizes the dotted acronym in chunk content before embedding, without altering stored content", async () => {
    const chunk: DocumentChunk = {
      id: "overview/what-is-score.md#0",
      sourcePath: "overview/what-is-score.md",
      category: "overview",
      title: "What is S.C.O.R.E.?",
      chunkIndex: 0,
      content: "S.C.O.R.E. helps small businesses manage inventory.",
      tokenCount: 10,
    };

    const [embedded] = await embedChunks([chunk]);

    expect(embedTextsMock).toHaveBeenCalledWith(["SCORE helps small businesses manage inventory."]);
    expect(embedded.content).toBe("S.C.O.R.E. helps small businesses manage inventory.");
  });
});

describe("ingestKnowledgeBase", () => {
  it("processes every real knowledge file, embedding and replacing chunks per source", async () => {
    const summary = await ingestKnowledgeBase(KNOWLEDGE_ROOT);

    expect(summary.filesProcessed).toBeGreaterThanOrEqual(8);
    expect(summary.chunksWritten).toBeGreaterThan(0);
    expect(summary.results).toHaveLength(summary.filesProcessed);

    expect(embedTextsMock).toHaveBeenCalledTimes(summary.filesProcessed);
    expect(fromMock).toHaveBeenCalledWith("document_chunks");
    expect(deleteEqMock).toHaveBeenCalledTimes(summary.filesProcessed);
    expect(insertMock).toHaveBeenCalledTimes(summary.filesProcessed);
  });

  it("throws a descriptive error when Supabase deletion fails", async () => {
    deleteEqMock.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(ingestKnowledgeBase(KNOWLEDGE_ROOT)).rejects.toThrow(/Failed to delete existing chunks/);
  });

  it("propagates an OpenAI embeddings failure", async () => {
    embedTextsMock.mockRejectedValueOnce(new Error("openai embeddings down"));
    await expect(ingestKnowledgeBase(KNOWLEDGE_ROOT)).rejects.toThrow("openai embeddings down");
  });
});

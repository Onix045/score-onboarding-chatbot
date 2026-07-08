import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildChunksForFile, ingestKnowledgeBase, listMarkdownFiles } from "./ingest";

const embedTextsMock = vi.fn();
const deleteEqMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/clients/voyage", () => ({
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

  it("propagates a Voyage embeddings failure", async () => {
    embedTextsMock.mockRejectedValueOnce(new Error("voyage down"));
    await expect(ingestKnowledgeBase(KNOWLEDGE_ROOT)).rejects.toThrow("voyage down");
  });
});

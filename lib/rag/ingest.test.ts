import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestKnowledgeBase, listMarkdownFiles, parseKnowledgeFile, replaceVectorStoreFile } from "./ingest";

const listFilesMock = vi.fn();
const createFileMock = vi.fn();
const pollMock = vi.fn();
const uploadFileMock = vi.fn();
const deleteFileMock = vi.fn();

vi.mock("@/lib/clients/openai", () => ({
  getOpenAIClient: () => ({
    files: {
      create: (...args: unknown[]) => uploadFileMock(...args),
      delete: (...args: unknown[]) => deleteFileMock(...args),
    },
    vectorStores: {
      files: {
        list: (...args: unknown[]) => listFilesMock(...args),
        create: (...args: unknown[]) => createFileMock(...args),
        poll: (...args: unknown[]) => pollMock(...args),
      },
    },
  }),
  getOrCreateVectorStoreIdForIngestion: async () => "vs_test123",
}));

const KNOWLEDGE_ROOT = join(process.cwd(), "content", "knowledge");

beforeEach(() => {
  listFilesMock.mockReset();
  createFileMock.mockReset();
  pollMock.mockReset();
  uploadFileMock.mockReset();
  deleteFileMock.mockReset();

  listFilesMock.mockReturnValue([]);
  uploadFileMock.mockImplementation(async () => ({ id: `file_${Math.random()}` }));
  createFileMock.mockResolvedValue({});
  pollMock.mockImplementation(async (_vectorStoreId: string, fileId: string) => ({
    id: fileId,
    status: "completed",
  }));
  deleteFileMock.mockResolvedValue({});
});

describe("listMarkdownFiles", () => {
  it("finds every knowledge markdown file across all categories", () => {
    const files = listMarkdownFiles(KNOWLEDGE_ROOT);
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(files.every((file) => file.endsWith(".md"))).toBe(true);
  });
});

describe("parseKnowledgeFile", () => {
  it("parses frontmatter from a real knowledge file, stripping it from the body", () => {
    const filePath = join(KNOWLEDGE_ROOT, "inventory", "inventory-tracking.md");
    const rawContent = readFileSync(filePath, "utf8");

    const parsed = parseKnowledgeFile(rawContent, filePath, KNOWLEDGE_ROOT);

    expect(parsed.sourcePath).toBe("inventory/inventory-tracking.md");
    expect(parsed.category).toBe("inventory");
    expect(parsed.title).toBe("Inventory tracking");
    expect(parsed.body.length).toBeGreaterThan(0);
    expect(parsed.body).not.toMatch(/^---/);
  });
});

describe("replaceVectorStoreFile", () => {
  const FILE = {
    sourcePath: "overview/what-is-score.md",
    category: "overview" as const,
    title: "What is S.C.O.R.E.?",
    body: "S.C.O.R.E. helps small businesses manage inventory.",
  };

  it("deletes previous versions only after the replacement is indexed", async () => {
    uploadFileMock.mockResolvedValue({ id: "file_new" });
    await replaceVectorStoreFile(FILE, "vs_test123", [
      { id: "old_file_1", attributes: { sourcePath: FILE.sourcePath } },
    ]);

    expect(deleteFileMock).toHaveBeenCalledTimes(1);
    expect(deleteFileMock).toHaveBeenCalledWith("old_file_1");
    expect(pollMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteFileMock.mock.invocationCallOrder[0]
    );
  });

  it("uploads the file and attaches it with sourcePath/category/title attributes", async () => {
    uploadFileMock.mockResolvedValue({ id: "file_new" });

    const fileId = await replaceVectorStoreFile(FILE, "vs_test123", []);

    expect(fileId).toBe("file_new");
    expect(createFileMock).toHaveBeenCalledWith("vs_test123", {
      file_id: "file_new",
      attributes: {
        sourcePath: "overview/what-is-score.md",
        category: "overview",
        title: "What is S.C.O.R.E.?",
        managedBy: "score-ingest",
      },
      chunking_strategy: {
        type: "static",
        static: { max_chunk_size_tokens: 400, chunk_overlap_tokens: 80 },
      },
    });
    expect(pollMock).toHaveBeenCalledWith("vs_test123", "file_new");
  });

  it("throws a descriptive error when the file fails to process", async () => {
    uploadFileMock.mockResolvedValue({ id: "file_bad" });
    pollMock.mockResolvedValue({
      id: "file_bad",
      status: "failed",
      last_error: { message: "unsupported file" },
    });

    await expect(replaceVectorStoreFile(FILE, "vs_test123", [])).rejects.toThrow(
      /unsupported file/
    );
    expect(deleteFileMock).toHaveBeenCalledWith("file_bad");
  });

  it("propagates an upload failure", async () => {
    uploadFileMock.mockRejectedValue(new Error("openai upload down"));
    await expect(replaceVectorStoreFile(FILE, "vs_test123", [])).rejects.toThrow(
      "openai upload down"
    );
  });
});

describe("ingestKnowledgeBase", () => {
  it("processes every real knowledge file, uploading and replacing per source", async () => {
    const summary = await ingestKnowledgeBase(KNOWLEDGE_ROOT);

    expect(summary.filesProcessed).toBeGreaterThanOrEqual(8);
    expect(summary.vectorStoreId).toBe("vs_test123");
    expect(summary.filesRemoved).toBe(0);
    expect(summary.results).toHaveLength(summary.filesProcessed);
    expect(uploadFileMock).toHaveBeenCalledTimes(summary.filesProcessed);
    expect(createFileMock).toHaveBeenCalledTimes(summary.filesProcessed);
  });
});

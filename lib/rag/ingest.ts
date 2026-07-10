import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { toFile } from "openai";
import { getOpenAIClient, getOrCreateVectorStoreIdForIngestion } from "@/lib/clients/openai";
import { parseFrontmatter } from "./parseFrontmatter";
import type { KnowledgeCategory } from "./types";

const MANAGED_BY = "score-ingest";
const CHUNKING_STRATEGY = {
  type: "static" as const,
  static: { max_chunk_size_tokens: 400, chunk_overlap_tokens: 80 },
};

export interface ParsedKnowledgeFile {
  sourcePath: string;
  category: KnowledgeCategory;
  title: string;
  body: string;
}

export interface IngestFileResult {
  sourcePath: string;
  fileId: string;
}

export interface IngestSummary {
  vectorStoreId: string;
  filesProcessed: number;
  filesRemoved: number;
  results: IngestFileResult[];
}

interface ExistingVectorStoreFile {
  id: string;
  attributes?: Record<string, string | number | boolean> | null;
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

/** Recursively lists every .md file under root. Local repo content only —
 * no crawling, no upload path. */
export function listMarkdownFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

/** Pure: parse one file's already-read contents. No fs, no network. */
export function parseKnowledgeFile(rawContent: string, absolutePath: string, root: string): ParsedKnowledgeFile {
  const sourcePath = toPosixPath(relative(root, absolutePath));
  const parsed = parseFrontmatter(rawContent, sourcePath);
  return { sourcePath, category: parsed.category, title: parsed.title, body: parsed.body };
}

/**
 * Uploads and indexes a replacement before deleting older versions. A
 * failed upload therefore cannot remove the currently searchable source.
 */
export async function replaceVectorStoreFile(
  file: ParsedKnowledgeFile,
  vectorStoreId: string,
  previousFiles: ExistingVectorStoreFile[]
): Promise<string> {
  const client = getOpenAIClient();
  const uploaded = await client.files.create({
    file: await toFile(Buffer.from(file.body, "utf8"), file.sourcePath, { type: "text/markdown" }),
    purpose: "assistants",
  });

  try {
    await client.vectorStores.files.create(vectorStoreId, {
      file_id: uploaded.id,
      attributes: {
        sourcePath: file.sourcePath,
        category: file.category,
        title: file.title,
        managedBy: MANAGED_BY,
      },
      chunking_strategy: CHUNKING_STRATEGY,
    });

    const processed = await client.vectorStores.files.poll(vectorStoreId, uploaded.id);
    if (processed.status !== "completed") {
      throw new Error(
        `Failed to process ${file.sourcePath}: ${processed.last_error?.message ?? processed.status}`
      );
    }
  } catch (error) {
    await client.files.delete(uploaded.id).catch(() => undefined);
    throw error;
  }

  for (const previous of previousFiles) {
    if (previous.id !== uploaded.id) await client.files.delete(previous.id);
  }
  return uploaded.id;
}

/**
 * Reads every approved Markdown file under `root`, validates frontmatter
 * (failing the whole run on an unrecognized category or missing
 * `confirmed: true` rather than silently skipping it), and uploads each to
 * the knowledge-base vector store. Manual, explicit — invoked only via
 * `npm run ingest`, never automatically or from a web request.
 */
export async function ingestKnowledgeBase(root: string): Promise<IngestSummary> {
  // Parse the complete corpus before the first remote mutation. Invalid
  // frontmatter in a later file can never leave a partially updated store.
  const parsedFiles = listMarkdownFiles(root).map((filePath) =>
    parseKnowledgeFile(readFileSync(filePath, "utf8"), filePath, root)
  );

  const client = getOpenAIClient();
  const vectorStoreId = await getOrCreateVectorStoreIdForIngestion();
  const existingFiles: ExistingVectorStoreFile[] = [];
  for await (const existing of client.vectorStores.files.list(vectorStoreId)) {
    existingFiles.push(existing);
  }

  const results: IngestFileResult[] = [];
  for (const file of parsedFiles) {
    const previous = existingFiles.filter(
      (existing) => existing.attributes?.sourcePath === file.sourcePath
    );
    const fileId = await replaceVectorStoreFile(file, vectorStoreId, previous);
    results.push({ sourcePath: file.sourcePath, fileId });
  }

  const localPaths = new Set(parsedFiles.map((file) => file.sourcePath));
  const staleFiles = existingFiles.filter(
    (existing) =>
      existing.attributes?.managedBy === MANAGED_BY &&
      typeof existing.attributes.sourcePath === "string" &&
      !localPaths.has(existing.attributes.sourcePath)
  );
  for (const stale of staleFiles) await client.files.delete(stale.id);

  return {
    vectorStoreId,
    filesProcessed: parsedFiles.length,
    filesRemoved: staleFiles.length,
    results,
  };
}

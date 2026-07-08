import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { embedTexts } from "@/lib/clients/voyage";
import { getSupabaseServiceRoleClient } from "@/lib/clients/supabase";
import { chunkMarkdown } from "./chunk";
import { parseFrontmatter } from "./parseFrontmatter";
import type { DocumentChunk, EmbeddedChunk } from "./types";

export interface IngestFileResult {
  sourcePath: string;
  chunkCount: number;
}

export interface IngestSummary {
  filesProcessed: number;
  chunksWritten: number;
  results: IngestFileResult[];
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
  return files;
}

/** Pure: parse + chunk one file's already-read contents. No fs, no network. */
export function buildChunksForFile(rawContent: string, absolutePath: string, root: string): DocumentChunk[] {
  const sourcePath = toPosixPath(relative(root, absolutePath));
  const parsed = parseFrontmatter(rawContent, sourcePath);
  return chunkMarkdown(parsed.body, { sourcePath, category: parsed.category, title: parsed.title });
}

export async function embedChunks(chunks: DocumentChunk[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  return chunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] }));
}

/** Delete-then-insert by source_path — simple, idempotent "replace by
 * source" strategy, appropriate for a knowledge base this small. */
export async function replaceChunksForSource(
  sourcePath: string,
  embeddedChunks: EmbeddedChunk[]
): Promise<void> {
  const client = getSupabaseServiceRoleClient();

  const { error: deleteError } = await client.from("document_chunks").delete().eq("source_path", sourcePath);
  if (deleteError) {
    throw new Error(`Failed to delete existing chunks for ${sourcePath}: ${deleteError.message}`);
  }

  if (embeddedChunks.length === 0) return;

  const { error: insertError } = await client.from("document_chunks").insert(
    embeddedChunks.map((chunk) => ({
      id: chunk.id,
      source_path: chunk.sourcePath,
      category: chunk.category,
      title: chunk.title,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: chunk.embedding,
    }))
  );
  if (insertError) {
    throw new Error(`Failed to insert chunks for ${sourcePath}: ${insertError.message}`);
  }
}

/**
 * Reads every approved Markdown file under `root`, validates frontmatter
 * (failing the whole run on an unrecognized category or missing
 * `confirmed: true` rather than silently skipping it), chunks it, embeds
 * the chunks in one batched Voyage call per file, and replaces that file's
 * rows in Supabase. Manual, explicit — invoked only via `npm run ingest`,
 * never automatically or from a web request.
 */
export async function ingestKnowledgeBase(root: string): Promise<IngestSummary> {
  const filePaths = listMarkdownFiles(root);
  const results: IngestFileResult[] = [];
  let chunksWritten = 0;

  for (const filePath of filePaths) {
    const rawContent = readFileSync(filePath, "utf8");
    const chunks = buildChunksForFile(rawContent, filePath, root);
    const sourcePath = toPosixPath(relative(root, filePath));
    const embedded = await embedChunks(chunks);
    await replaceChunksForSource(sourcePath, embedded);
    results.push({ sourcePath, chunkCount: chunks.length });
    chunksWritten += chunks.length;
  }

  return { filesProcessed: filePaths.length, chunksWritten, results };
}

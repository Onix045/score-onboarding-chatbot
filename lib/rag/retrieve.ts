import { getSupabaseServiceRoleClient } from "@/lib/clients/supabase";
import type { KnowledgeCategory, RetrievedChunk } from "./types";

// Hard ceiling, never trusted from a caller-supplied count — matches the
// architecture doc's "match_count is always clamped to Math.min(requested, 4)".
const HARD_MAX_CHUNKS = 4;

interface MatchDocumentChunksRow {
  id: string;
  source_path: string;
  category: string;
  title: string;
  chunk_index: number;
  content: string;
  token_count: number;
  similarity: number;
}

export interface RetrieveOptions {
  queryEmbedding: number[];
  similarityThreshold: number;
  maxChunks: number;
}

/**
 * Calls the `match_document_chunks` Supabase RPC and re-applies the
 * similarity threshold in TypeScript — the SQL function already filters,
 * but enforcing it here too keeps the cutoff unit-testable against mocked
 * retrieval results, per the architecture doc.
 */
export async function retrieveRelevantChunks({
  queryEmbedding,
  similarityThreshold,
  maxChunks,
}: RetrieveOptions): Promise<RetrievedChunk[]> {
  const client = getSupabaseServiceRoleClient();
  const clampedMaxChunks = Math.max(0, Math.min(maxChunks, HARD_MAX_CHUNKS));

  const { data, error } = await client.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: similarityThreshold,
    match_count: clampedMaxChunks,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  const rows = (data ?? []) as MatchDocumentChunksRow[];

  return rows
    .filter((row) => row.similarity > similarityThreshold)
    .map((row) => ({
      id: row.id,
      sourcePath: row.source_path,
      category: row.category as KnowledgeCategory,
      title: row.title,
      chunkIndex: row.chunk_index,
      content: row.content,
      tokenCount: row.token_count,
      similarity: row.similarity,
    }));
}

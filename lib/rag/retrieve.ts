import { getOpenAIClient, getRequiredVectorStoreId } from "@/lib/clients/openai";
import { isKnowledgeCategory, type RetrievedChunk } from "./types";

// Hard ceiling, never trusted from a caller-supplied count — matches the
// architecture doc's "match_count is always clamped to Math.min(requested, 4)".
const HARD_MAX_CHUNKS = 4;

// A generous cap for the limitations-doc fallback fetch, where the goal is
// "get every chunk of this one small file" rather than "rank and truncate."
const LIMITATIONS_FALLBACK_MAX_RESULTS = 20;

// vectorStores.search requires a non-empty query even when a `filters`
// clause already narrows the search to one exact file — the text itself
// barely matters for ranking within a single small file, so a fixed
// generic phrase avoids threading the user's question through just for
// this call.
const LIMITATIONS_FALLBACK_QUERY = "unsupported or not yet available features";

interface VectorStoreSearchResult {
  file_id: string;
  filename: string;
  score: number;
  attributes: Record<string, string | number | boolean> | null;
  content: Array<{ text: string; type: string }>;
}

function requiredStringAttribute(
  attributes: Record<string, string | number | boolean>,
  key: string
): string {
  const value = attributes[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Vector search result is missing the "${key}" attribute`);
  }
  return value;
}

function toRetrievedChunk(result: VectorStoreSearchResult, index: number): RetrievedChunk {
  const attributes = result.attributes ?? {};
  const category = attributes.category;
  if (!isKnowledgeCategory(category)) {
    throw new Error("Vector search result has an invalid category attribute");
  }
  const content = result.content.map((piece) => piece.text).join("\n").trim();
  if (!content) throw new Error("Vector search result has no text content");

  return {
    id: `${result.file_id}#${index}`,
    sourcePath: requiredStringAttribute(attributes, "sourcePath"),
    category,
    title: requiredStringAttribute(attributes, "title"),
    chunkIndex: index,
    content,
    tokenCount: Math.max(1, Math.ceil(content.length / 4)),
    similarity: result.score,
  };
}

function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.max(0, Math.min(value, 1));
}

function clampMaxChunks(value: number): number {
  if (!Number.isFinite(value)) return HARD_MAX_CHUNKS;
  return Math.max(1, Math.min(Math.trunc(value), HARD_MAX_CHUNKS));
}

export interface RetrieveOptions {
  query: string;
  similarityThreshold: number;
  maxChunks: number;
}

/**
 * Searches the knowledge-base vector store and re-applies the similarity
 * threshold in TypeScript — OpenAI's hybrid (semantic + keyword) search
 * already ranks results, but enforcing the cutoff here too keeps it
 * unit-testable against mocked search results, per the architecture doc.
 */
export async function retrieveRelevantChunks({
  query,
  similarityThreshold,
  maxChunks,
}: RetrieveOptions): Promise<RetrievedChunk[]> {
  const client = getOpenAIClient();
  const vectorStoreId = getRequiredVectorStoreId();
  const threshold = clampThreshold(similarityThreshold);

  const page = await client.vectorStores.search(vectorStoreId, {
    query,
    max_num_results: clampMaxChunks(maxChunks),
    ranking_options: { score_threshold: threshold },
  });

  return (page.data as VectorStoreSearchResult[])
    .filter((result) => result.score > threshold)
    .map(toRetrievedChunk);
}

/**
 * Fetches every chunk of one known source file, filtered by exact path —
 * no similarity threshold involved. Used by route.ts as the grounding
 * evidence of last resort — when normal search finds nothing, this pulls
 * the "not yet confirmed" content so the model still generates a real,
 * non-invented answer instead of a canned string.
 */
export async function retrieveChunksBySourcePath(sourcePath: string): Promise<RetrievedChunk[]> {
  const client = getOpenAIClient();
  const vectorStoreId = getRequiredVectorStoreId();

  const page = await client.vectorStores.search(vectorStoreId, {
    query: LIMITATIONS_FALLBACK_QUERY,
    filters: { key: "sourcePath", type: "eq", value: sourcePath },
    max_num_results: LIMITATIONS_FALLBACK_MAX_RESULTS,
  });

  return (page.data as VectorStoreSearchResult[]).map(toRetrievedChunk);
}

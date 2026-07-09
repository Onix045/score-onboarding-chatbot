import OpenAI from "openai";

// Pinned in one place: the embedding model's output dimension must match the
// document_chunks.embedding vector(512) column. text-embedding-3-small
// supports the `dimensions` parameter to request a shorter output at the
// same price, so we ask for exactly 512 rather than changing the schema.
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;

let cachedClient: OpenAI | null = null;

/** Server-only OpenAI client. Never import this from a "use client" file. */
export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  // A single, bounded attempt per call: retries live one layer up, in
  // lib/rag/withRetry.ts, which every route.ts call site is wrapped in.
  // Stacking the SDK's own maxRetries under that app-level retry would
  // multiply worst-case latency (each SDK-level attempt re-times-out
  // before the app-level retry even gets a turn) — a truly-down API could
  // then take minutes to fall back instead of seconds. One retry layer,
  // with a shorter per-attempt timeout, keeps worst-case latency bounded
  // while still surviving the transient resets/timeouts observed in this
  // environment.
  cachedClient = new OpenAI({ apiKey, timeout: 10_000, maxRetries: 0 });
  return cachedClient;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

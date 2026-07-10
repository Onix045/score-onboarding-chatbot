import OpenAI from "openai";

// Pinned once here rather than duplicated in generate.ts and rewrite.ts —
// both chat-completion call sites import this instead of hardcoding their
// own copy of the model name.
export const CHAT_MODEL = "gpt-4o-mini";

// The one vector store this app uses, looked up by name rather than a
// stored ID — avoids needing an env var or any persistence layer at all,
// matching CLAUDE.md's "no database" constraint. Created on first use if it
// doesn't exist yet (normally that's during `npm run ingest`).
export const VECTOR_STORE_NAME = "score-knowledge-base";

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

/**
 * Runtime retrieval is deliberately read-only with respect to
 * infrastructure. A support request must never create an empty vector
 * store because configuration is missing.
 */
export function getRequiredVectorStoreId(): string {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  if (!vectorStoreId) throw new Error("OPENAI_VECTOR_STORE_ID is not set");
  return vectorStoreId;
}

/**
 * Provisioning helper used only by the manual ingestion command. Existing
 * deployments should configure OPENAI_VECTOR_STORE_ID; first-time setup may
 * discover or create the named store and then persist the returned ID.
 */
export async function getOrCreateVectorStoreIdForIngestion(): Promise<string> {
  const configuredId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  if (configuredId) return configuredId;

  const client = getOpenAIClient();
  for await (const store of client.vectorStores.list({ order: "asc" })) {
    if (store.name === VECTOR_STORE_NAME) return store.id;
  }

  const created = await client.vectorStores.create({ name: VECTOR_STORE_NAME });
  return created.id;
}

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageEmbeddingsResponse {
  data: { embedding: number[] }[];
}

/**
 * Thin fetch wrapper around Voyage AI's embeddings endpoint — no SDK
 * dependency, since a single POST doesn't justify one.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  const model = process.env.VOYAGE_EMBEDDING_MODEL;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");
  if (!model) throw new Error("VOYAGE_EMBEDDING_MODEL is not set");

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model }),
  });

  if (!response.ok) {
    throw new Error(`Voyage embeddings request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as VoyageEmbeddingsResponse;
  return payload.data.map((item) => item.embedding);
}

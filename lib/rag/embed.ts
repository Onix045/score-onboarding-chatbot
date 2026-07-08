import { embedTexts } from "@/lib/clients/voyage";

/** Embeds the user's question only — never chat history, which is
 * explicitly excluded from this pipeline. */
export async function embedQuery(question: string): Promise<number[]> {
  const [embedding] = await embedTexts([question]);
  return embedding;
}

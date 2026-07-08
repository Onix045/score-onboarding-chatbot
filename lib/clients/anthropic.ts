import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/** Server-only Claude client. Never import this from a "use client" file. */
export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

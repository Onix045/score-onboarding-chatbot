import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/rag/embed";
import { UNSUPPORTED_FEATURE_FALLBACK } from "@/lib/rag/fallback";
import { generateAnswer } from "@/lib/rag/generate";
import { checkGuardrails } from "@/lib/rag/guardrails";
import { checkRateLimit } from "@/lib/rag/rateLimit";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import type { RetrievedChunk, SourceCitation, SupportAnswer } from "@/lib/rag/types";
import { QuestionValidationError, validateQuestion } from "@/lib/rag/validate";

function getEnvNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && process.env[name] ? parsed : fallback;
}

const SIMILARITY_THRESHOLD = getEnvNumber("RAG_SIMILARITY_THRESHOLD", 0.75);
const MAX_CHUNKS = getEnvNumber("RAG_MAX_CHUNKS", 4);

// Basic in-memory abuse protection suitable for a single-instance prototype
// demo — not a substitute for production-grade rate limiting.
const RATE_LIMIT_OPTIONS = { limit: 20, windowMs: 60_000 };

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

function toSources(chunks: RetrievedChunk[]): SourceCitation[] {
  const seen = new Set<string>();
  const sources: SourceCitation[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.category}::${chunk.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ title: chunk.title, category: chunk.category });
  }

  return sources;
}

function fallbackResponse(): SupportAnswer {
  return { answer: UNSUPPORTED_FEATURE_FALLBACK, grounded: false, sources: [] };
}

function logServerError(label: string, error: unknown): void {
  // Server-only logging: a short label plus the error message, never a
  // secret, never forwarded to the client.
  console.error(label, error instanceof Error ? error.message : error);
}

/**
 * The only network entry point for the RAG support path. Deterministically
 * short-circuits to the fixed fallback (Claude is never called) when a
 * guardrail matches, when zero retrieved chunks clear the similarity
 * threshold, or when any upstream step throws — the caller never sees a
 * raw error, stack trace, or which specific backend failed.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_OPTIONS);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const question =
    typeof body === "object" && body !== null && "question" in body
      ? (body as { question: unknown }).question
      : undefined;

  if (typeof question !== "string") {
    return NextResponse.json({ error: "\"question\" must be a string." }, { status: 400 });
  }

  let validatedQuestion: string;
  try {
    validatedQuestion = validateQuestion(question);
  } catch (error) {
    if (error instanceof QuestionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const guardrailMatch = checkGuardrails(validatedQuestion);
  if (guardrailMatch) {
    const response: SupportAnswer = { answer: guardrailMatch.response, grounded: false, sources: [] };
    return NextResponse.json(response);
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(validatedQuestion);
  } catch (error) {
    logServerError("Voyage embedding failed:", error);
    return NextResponse.json(fallbackResponse());
  }

  let chunks: RetrievedChunk[];
  try {
    chunks = await retrieveRelevantChunks({
      queryEmbedding,
      similarityThreshold: SIMILARITY_THRESHOLD,
      maxChunks: MAX_CHUNKS,
    });
  } catch (error) {
    logServerError("Supabase retrieval failed:", error);
    return NextResponse.json(fallbackResponse());
  }

  if (chunks.length === 0) {
    return NextResponse.json(fallbackResponse());
  }

  try {
    const answer = await generateAnswer(validatedQuestion, chunks);
    const response: SupportAnswer = { answer, grounded: true, sources: toSources(chunks) };
    return NextResponse.json(response);
  } catch (error) {
    logServerError("Claude generation failed:", error);
    return NextResponse.json(fallbackResponse());
  }
}

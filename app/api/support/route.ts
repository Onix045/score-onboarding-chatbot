import { NextResponse } from "next/server";
import { UNSUPPORTED_FEATURE_FALLBACK } from "@/lib/rag/fallback";
import { generateAnswer } from "@/lib/rag/generate";
import { checkGreeting } from "@/lib/rag/greeting";
import { checkGuardrails } from "@/lib/rag/guardrails";
import { CONVERSATION_CONTROL_RESPONSE, detectConversationIntent } from "@/lib/rag/intent";
import { checkRateLimit } from "@/lib/rag/rateLimit";
import { retrieveChunksBySourcePath, retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { rewriteQuestionWithHistory } from "@/lib/rag/rewrite";
import type { ChatHistoryTurn, RetrievedChunk, SourceCitation, SupportAnswer } from "@/lib/rag/types";
import { QuestionValidationError, validateHistory, validateQuestion } from "@/lib/rag/validate";
import { withRetry } from "@/lib/rag/withRetry";

function getEnvNumber(
  name: string,
  fallback: number,
  { min, max, integer = false }: { min: number; max: number; integer?: boolean }
): number {
  const parsed = Number(process.env[name]);
  if (!process.env[name] || !Number.isFinite(parsed)) return fallback;
  const normalized = integer ? Math.trunc(parsed) : parsed;
  return normalized >= min && normalized <= max ? normalized : fallback;
}

const SIMILARITY_THRESHOLD = getEnvNumber("RAG_SIMILARITY_THRESHOLD", 0.35, {
  min: 0,
  max: 1,
});
const MAX_CHUNKS = getEnvNumber("RAG_MAX_CHUNKS", 4, {
  min: 1,
  max: 4,
  integer: true,
});

// The confirmed "not yet available" content (CLAUDE.md §2) — the grounding
// of last resort so every question still gets a real, generated answer
// instead of the fixed fallback string.
const LIMITATIONS_SOURCE_PATH = "limitations/unsupported-features.md";

// Basic in-memory abuse protection suitable for a single-instance prototype
// demo — not a substitute for production-grade rate limiting.
const RATE_LIMIT_OPTIONS = {
  limit: getEnvNumber("RAG_RATE_LIMIT_MAX_REQUESTS", 20, {
    min: 1,
    max: 1_000,
    integer: true,
  }),
  windowMs: getEnvNumber("RAG_RATE_LIMIT_WINDOW_MS", 60_000, {
    min: 1_000,
    max: 3_600_000,
    integer: true,
  }),
};

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
 * short-circuits (no similarity search) to a friendly greeting on bare
 * small talk, or to a fixed canned string when a guardrail matches the raw
 * question or a history-resolved question (sensitive-data, real-account,
 * or legal-financial-advice — honesty/safety refusals with no knowledge-
 * base content to ground against). Every other question, including ones
 * about unconfirmed topics like pricing or hardware, goes through the same
 * vector-store retrieve → generate pipeline. When zero retrieved chunks clear
 * the similarity threshold, the route doesn't return the fixed string
 * directly — it falls back to the confirmed "not yet available" content
 * (content/knowledge/limitations/unsupported-features.md) as evidence and
 * still generates a real, non-invented answer from it, so the user gets a
 * relevant reply instead of canned text for any question. The fixed string
 * is reserved for true failure: it fires only when that limitations
 * content itself can't be found, or when any upstream step (history
 * rewrite, retrieve, generate) throws even after one withRetry
 * attempt — this environment has observed transient OpenAI
 * connection failures that a single retry usually recovers from, so a lone
 * flaky call isn't the difference between a real answer and the fallback.
 * The caller never
 * sees a raw error, stack trace, or which specific backend failed.
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

  const historyRaw =
    typeof body === "object" && body !== null && "history" in body
      ? (body as { history: unknown }).history
      : undefined;

  let history: ChatHistoryTurn[];
  try {
    history = validateHistory(historyRaw);
  } catch (error) {
    if (error instanceof QuestionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const greeting = checkGreeting(validatedQuestion);
  if (greeting) {
    const response: SupportAnswer = { answer: greeting, grounded: false, sources: [] };
    return NextResponse.json(response);
  }

  const guardrailMatch = checkGuardrails(validatedQuestion);
  if (guardrailMatch) {
    const response: SupportAnswer = { answer: guardrailMatch.response, grounded: false, sources: [] };
    return NextResponse.json(response);
  }

  if (detectConversationIntent(validatedQuestion) === "conversation_control") {
    const response: SupportAnswer = { answer: CONVERSATION_CONTROL_RESPONSE, grounded: false, sources: [] };
    return NextResponse.json(response);
  }

  let resolvedQuestion = validatedQuestion;
  if (history.length > 0) {
    try {
      resolvedQuestion = await withRetry(() => rewriteQuestionWithHistory(validatedQuestion, history));
    } catch (error) {
      logServerError("OpenAI rewrite failed:", error);
      return NextResponse.json(fallbackResponse());
    }

    const resolvedGuardrailMatch = checkGuardrails(resolvedQuestion);
    if (resolvedGuardrailMatch) {
      const response: SupportAnswer = { answer: resolvedGuardrailMatch.response, grounded: false, sources: [] };
      return NextResponse.json(response);
    }
  }

  let chunks: RetrievedChunk[];
  try {
    chunks = await withRetry(() =>
      retrieveRelevantChunks({
        query: resolvedQuestion,
        similarityThreshold: SIMILARITY_THRESHOLD,
        maxChunks: MAX_CHUNKS,
      })
    );
  } catch (error) {
    logServerError("Vector store retrieval failed:", error);
    return NextResponse.json(fallbackResponse());
  }

  if (chunks.length === 0) {
    try {
      chunks = await withRetry(() => retrieveChunksBySourcePath(LIMITATIONS_SOURCE_PATH));
    } catch (error) {
      logServerError("Vector store limitations retrieval failed:", error);
      return NextResponse.json(fallbackResponse());
    }

    if (chunks.length === 0) {
      return NextResponse.json(fallbackResponse());
    }
  }

  try {
    const answer = await withRetry(() =>
      generateAnswer({ question: resolvedQuestion, originalQuestion: validatedQuestion, history, chunks })
    );
    const response: SupportAnswer = { answer, grounded: true, sources: toSources(chunks) };
    return NextResponse.json(response);
  } catch (error) {
    logServerError("OpenAI generation failed:", error);
    return NextResponse.json(fallbackResponse());
  }
}

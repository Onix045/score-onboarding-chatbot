import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/rag/embed";
import { UNSUPPORTED_FEATURE_FALLBACK } from "@/lib/rag/fallback";
import { generateAnswer } from "@/lib/rag/generate";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import type { RetrievedChunk, SourceCitation, SupportAnswer } from "@/lib/rag/types";
import { QuestionValidationError, validateQuestion } from "@/lib/rag/validate";

function getEnvNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && process.env[name] ? parsed : fallback;
}

const SIMILARITY_THRESHOLD = getEnvNumber("RAG_SIMILARITY_THRESHOLD", 0.75);
const MAX_CHUNKS = getEnvNumber("RAG_MAX_CHUNKS", 4);

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

/**
 * The only network entry point for the RAG support path. Deterministically
 * short-circuits to the fixed fallback (Claude is never called) when zero
 * retrieved chunks clear the similarity threshold, or when any step throws
 * — the caller never sees a raw error or stack trace.
 */
export async function POST(request: Request) {
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

  try {
    const queryEmbedding = await embedQuery(validatedQuestion);
    const chunks = await retrieveRelevantChunks({
      queryEmbedding,
      similarityThreshold: SIMILARITY_THRESHOLD,
      maxChunks: MAX_CHUNKS,
    });

    if (chunks.length === 0) {
      return NextResponse.json(fallbackResponse());
    }

    const answer = await generateAnswer(validatedQuestion, chunks);
    const response: SupportAnswer = { answer, grounded: true, sources: toSources(chunks) };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Support route failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(fallbackResponse());
  }
}

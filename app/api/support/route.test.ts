import { beforeEach, describe, expect, it, vi } from "vitest";
import { GREETING_RESPONSE } from "@/lib/rag/greeting";
import { resetRateLimitStateForTests } from "@/lib/rag/rateLimit";
import { UNSUPPORTED_FEATURE_FALLBACK } from "@/lib/rag/fallback";
import { POST } from "./route";
import type { RetrievedChunk } from "@/lib/rag/types";
import { LEGAL_FINANCIAL_ADVICE_RESPONSE, REAL_ACCOUNT_RESPONSE, SENSITIVE_DATA_RESPONSE } from "@/lib/rag/guardrails";

const embedQueryMock = vi.fn();
const retrieveRelevantChunksMock = vi.fn();
const retrieveChunksBySourcePathMock = vi.fn();
const generateAnswerMock = vi.fn();
const rewriteQuestionWithHistoryMock = vi.fn();

vi.mock("@/lib/rag/embed", () => ({
  embedQuery: (...args: unknown[]) => embedQueryMock(...args),
}));
vi.mock("@/lib/rag/retrieve", () => ({
  retrieveRelevantChunks: (...args: unknown[]) => retrieveRelevantChunksMock(...args),
  retrieveChunksBySourcePath: (...args: unknown[]) => retrieveChunksBySourcePathMock(...args),
}));
vi.mock("@/lib/rag/generate", () => ({
  generateAnswer: (...args: unknown[]) => generateAnswerMock(...args),
}));
vi.mock("@/lib/rag/rewrite", () => ({
  rewriteQuestionWithHistory: (...args: unknown[]) => rewriteQuestionWithHistoryMock(...args),
}));

const CHUNK: RetrievedChunk = {
  id: "inventory/inventory-tracking.md#0",
  sourcePath: "inventory/inventory-tracking.md",
  category: "inventory",
  title: "Inventory tracking",
  chunkIndex: 0,
  content: "Inventory tracking keeps a running count of stock.",
  tokenCount: 12,
  similarity: 0.9,
};

function limitationsChunk(chunkIndex: number, heading: string): RetrievedChunk {
  return {
    id: `limitations/unsupported-features.md#${chunkIndex}`,
    sourcePath: "limitations/unsupported-features.md",
    category: "limitations",
    title: "Features we can't confirm yet",
    chunkIndex,
    content: `${heading}\n\nI don't have confirmed information about that feature yet.`,
    tokenCount: 15,
    similarity: 1,
  };
}

const ALL_LIMITATIONS_CHUNKS = [
  limitationsChunk(0, "Pricing and plans"),
  limitationsChunk(3, "Hardware and device compatibility"),
  limitationsChunk(4, "Offline support"),
];

function postRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/support", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  embedQueryMock.mockReset();
  retrieveRelevantChunksMock.mockReset();
  retrieveChunksBySourcePathMock.mockReset();
  generateAnswerMock.mockReset();
  rewriteQuestionWithHistoryMock.mockReset();
  embedQueryMock.mockResolvedValue([0.1, 0.2]);
  retrieveRelevantChunksMock.mockResolvedValue([]);
  retrieveChunksBySourcePathMock.mockResolvedValue(ALL_LIMITATIONS_CHUNKS);
  resetRateLimitStateForTests();
});

describe("POST /api/support", () => {
  it("returns 400 for malformed JSON without calling any client", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(400);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it("returns 400 when question is missing or not a string", async () => {
    const response = await POST(postRequest({ question: 42 }));
    expect(response.status).toBe(400);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty question", async () => {
    const response = await POST(postRequest({ question: "   " }));
    expect(response.status).toBe(400);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it("falls back to a grounded, limitations-based answer when zero chunks clear the threshold", async () => {
    generateAnswerMock.mockResolvedValue(
      "We don't have confirmed info on that yet — a S.C.O.R.E. team member can help."
    );

    const response = await POST(postRequest({ question: "Does it work offline?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(true);
    expect(payload.sources).toEqual([{ title: "Features we can't confirm yet", category: "limitations" }]);
    expect(retrieveChunksBySourcePathMock).toHaveBeenCalledWith("limitations/unsupported-features.md");
    expect(generateAnswerMock).toHaveBeenCalledWith("Does it work offline?", ALL_LIMITATIONS_CHUNKS);
  });

  it("returns the fixed fallback, never calling generation, when no limitations content can be found either", async () => {
    retrieveChunksBySourcePathMock.mockResolvedValue([]);

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(payload.answer).toBe(UNSUPPORTED_FEATURE_FALLBACK);
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("degrades to the fixed fallback, never a raw error, if fetching the limitations content fails", async () => {
    retrieveChunksBySourcePathMock.mockRejectedValue(new Error("supabase down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("supabase down");
  });

  it("returns a grounded answer with deduplicated sources when chunks are retrieved", async () => {
    retrieveRelevantChunksMock.mockResolvedValue([CHUNK, { ...CHUNK, chunkIndex: 1 }]);
    generateAnswerMock.mockResolvedValue("Inventory tracking explanation.");

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(true);
    expect(payload.answer).toBe("Inventory tracking explanation.");
    expect(payload.sources).toEqual([{ title: "Inventory tracking", category: "inventory" }]);
  });

  it("degrades to the fallback, never a raw error, when embedding fails", async () => {
    embedQueryMock.mockRejectedValue(new Error("openai embeddings down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("openai embeddings down");
  });

  it("degrades to the fallback when retrieval fails", async () => {
    retrieveRelevantChunksMock.mockRejectedValue(new Error("supabase down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("supabase down");
  });

  it("degrades to the fallback when generation fails", async () => {
    retrieveRelevantChunksMock.mockResolvedValue([CHUNK]);
    generateAnswerMock.mockRejectedValue(new Error("openai generation down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("openai generation down");
  });

  describe("greeting", () => {
    it("short-circuits a bare greeting with a friendly welcome, before calling OpenAI/Supabase", async () => {
      const response = await POST(postRequest({ question: "Hello" }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.answer).toBe(GREETING_RESPONSE);
      expect(payload.grounded).toBe(false);
      expect(embedQueryMock).not.toHaveBeenCalled();
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
      expect(generateAnswerMock).not.toHaveBeenCalled();
    });

    it("does not treat a real question containing a greeting word as small talk", async () => {
      generateAnswerMock.mockResolvedValue("We don't have confirmed info on offline support yet.");

      const response = await POST(postRequest({ question: "Hi, does it work offline?" }));
      const payload = await response.json();

      expect(payload.answer).not.toBe(GREETING_RESPONSE);
      expect(generateAnswerMock).toHaveBeenCalledWith("Hi, does it work offline?", ALL_LIMITATIONS_CHUNKS);
    });
  });

  describe("guardrails", () => {
    it("short-circuits sensitive-data submissions", async () => {
      const response = await POST(postRequest({ question: "My password is hunter2" }));
      const payload = await response.json();

      expect(payload.answer).toBe(SENSITIVE_DATA_RESPONSE);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("short-circuits real-account modification requests", async () => {
      const response = await POST(postRequest({ question: "Can you access my real account?" }));
      const payload = await response.json();

      expect(payload.answer).toBe(REAL_ACCOUNT_RESPONSE);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("short-circuits legal/tax/financial advice requests", async () => {
      const response = await POST(postRequest({ question: "Can you file my taxes?" }));
      const payload = await response.json();

      expect(payload.answer).toBe(LEGAL_FINANCIAL_ADVICE_RESPONSE);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });
  });

  describe("history", () => {
    it("does not call rewrite when history is absent", async () => {
      await POST(postRequest({ question: "What is inventory?" }));
      expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    });

    it("returns 400 when history is not an array", async () => {
      const response = await POST(postRequest({ question: "How can I use it?", history: "nope" }));
      expect(response.status).toBe(400);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("returns 400 when history exceeds the turn limit", async () => {
      const history = Array.from({ length: 7 }, () => ({ role: "user", text: "hi" }));
      const response = await POST(postRequest({ question: "How can I use it?", history }));
      expect(response.status).toBe(400);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("returns 400 for a malformed history entry", async () => {
      const response = await POST(
        postRequest({ question: "How can I use it?", history: [{ role: "system", text: "x" }] })
      );
      expect(response.status).toBe(400);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("rewrites a vague follow-up using history before embedding", async () => {
      rewriteQuestionWithHistoryMock.mockResolvedValue("How do I use inventory tracking?");
      retrieveRelevantChunksMock.mockResolvedValue([CHUNK]);
      generateAnswerMock.mockResolvedValue("Inventory tracking explanation.");

      const history = [
        { role: "user", text: "What is inventory tracking?" },
        { role: "assistant", text: "Inventory tracking keeps a running count of stock." },
      ];
      const response = await POST(postRequest({ question: "How can I use it?", history }));
      const payload = await response.json();

      expect(rewriteQuestionWithHistoryMock).toHaveBeenCalledWith("How can I use it?", history);
      expect(embedQueryMock).toHaveBeenCalledWith("How do I use inventory tracking?");
      expect(generateAnswerMock).toHaveBeenCalledWith("How do I use inventory tracking?", [CHUNK]);
      expect(payload.grounded).toBe(true);
    });

    it("degrades to the fallback, never a raw error, when rewrite fails", async () => {
      rewriteQuestionWithHistoryMock.mockRejectedValue(new Error("openai rewrite down"));

      const response = await POST(
        postRequest({
          question: "How can I use it?",
          history: [{ role: "user", text: "What is inventory tracking?" }],
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.grounded).toBe(false);
      expect(JSON.stringify(payload)).not.toContain("openai rewrite down");
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("re-checks guardrails on the rewritten question and short-circuits if it now matches", async () => {
      rewriteQuestionWithHistoryMock.mockResolvedValue("Can you access my real account?");

      const response = await POST(
        postRequest({
          question: "Can you do that for me?",
          history: [{ role: "user", text: "I want you to update my account." }],
        })
      );
      const payload = await response.json();

      expect(payload.answer).toBe(REAL_ACCOUNT_RESPONSE);
      expect(embedQueryMock).not.toHaveBeenCalled();
    });

    it("falls back to grounded, limitations-based generation when the rewritten question has no matching chunks", async () => {
      rewriteQuestionWithHistoryMock.mockResolvedValue("How much does the Pro plan cost?");
      generateAnswerMock.mockResolvedValue("We don't have confirmed pricing to share yet.");

      const response = await POST(
        postRequest({
          question: "What about the paid one?",
          history: [{ role: "user", text: "Does S.C.O.R.E. have a paid plan?" }],
        })
      );
      const payload = await response.json();

      expect(payload.grounded).toBe(true);
      expect(payload.answer).toBe("We don't have confirmed pricing to share yet.");
      expect(embedQueryMock).toHaveBeenCalledWith("How much does the Pro plan cost?");
      expect(generateAnswerMock).toHaveBeenCalledWith("How much does the Pro plan cost?", ALL_LIMITATIONS_CHUNKS);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 once the per-IP request limit is exceeded", async () => {
      const headers = { "x-forwarded-for": "9.9.9.9" };

      let lastResponse;
      for (let i = 0; i < 21; i++) {
        lastResponse = await POST(postRequest({ question: "What is inventory?" }, headers));
      }

      expect(lastResponse?.status).toBe(429);
    });

    it("does not rate-limit a different IP", async () => {
      const headers = { "x-forwarded-for": "1.1.1.1" };

      for (let i = 0; i < 21; i++) {
        await POST(postRequest({ question: "What is inventory?" }, headers));
      }

      const otherIpResponse = await POST(
        postRequest({ question: "What is inventory?" }, { "x-forwarded-for": "2.2.2.2" })
      );
      expect(otherIpResponse.status).toBe(200);
    });
  });
});

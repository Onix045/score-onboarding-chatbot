import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACKNOWLEDGEMENT_RESPONSE,
  FAREWELL_RESPONSE,
  GREETING_RESPONSE,
  LIGHT_CHAT_RESPONSE,
  WELLBEING_RESPONSE,
} from "@/lib/rag/greeting";
import { RURAL_CONTACT_RESPONSE } from "@/lib/rag/contact";
import { CONVERSATION_CONTROL_RESPONSE } from "@/lib/rag/intent";
import { resetRateLimitStateForTests } from "@/lib/rag/rateLimit";
import { UNSUPPORTED_FEATURE_FALLBACK } from "@/lib/rag/fallback";
import { POST } from "./route";
import type { RetrievedChunk } from "@/lib/rag/types";
import { LEGAL_FINANCIAL_ADVICE_RESPONSE, REAL_ACCOUNT_RESPONSE, SENSITIVE_DATA_RESPONSE } from "@/lib/rag/guardrails";
import { MAX_HISTORY_TURNS } from "@/lib/rag/validate";

const retrieveRelevantChunksMock = vi.fn();
const retrieveChunksBySourcePathMock = vi.fn();
const generateAnswerMock = vi.fn();
const rewriteQuestionWithHistoryMock = vi.fn();

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
  retrieveRelevantChunksMock.mockReset();
  retrieveChunksBySourcePathMock.mockReset();
  generateAnswerMock.mockReset();
  rewriteQuestionWithHistoryMock.mockReset();
  retrieveRelevantChunksMock.mockResolvedValue([]);
  retrieveChunksBySourcePathMock.mockResolvedValue(ALL_LIMITATIONS_CHUNKS);
  resetRateLimitStateForTests();
});

describe("POST /api/support", () => {
  it("returns 400 for malformed JSON without calling any client", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(400);
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
  });

  it("returns 400 when question is missing or not a string", async () => {
    const response = await POST(postRequest({ question: 42 }));
    expect(response.status).toBe(400);
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty question", async () => {
    const response = await POST(postRequest({ question: "   " }));
    expect(response.status).toBe(400);
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
  });

  it("answers wellbeing small talk without vector-store retrieval", async () => {
    const response = await POST(postRequest({ question: "How are you doing today?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(WELLBEING_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(retrieveChunksBySourcePathMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("answers short acknowledgements without rewriting or vector-store retrieval", async () => {
    const response = await POST(
      postRequest({
        question: "good.",
        history: [
          { role: "user", text: "What is inventory tracking?" },
          { role: "assistant", text: "Inventory tracking keeps a running count of stock." },
        ],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(ACKNOWLEDGEMENT_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("answers conversation-control messages without rewriting or vector-store retrieval", async () => {
    const response = await POST(
      postRequest({
        question: "hey, don't repeat answer",
        history: [
          { role: "user", text: "What is inventory tracking?" },
          { role: "assistant", text: "Inventory tracking keeps a running count of stock." },
        ],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(CONVERSATION_CONTROL_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("answers farewells without vector-store retrieval", async () => {
    const response = await POST(
      postRequest({
        question: "bye, bot",
        history: [
          { role: "user", text: "How can I start?" },
          { role: "assistant", text: "Try the practice setup flow." },
        ],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(FAREWELL_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("answers short joking or meta messages without guessing a product question", async () => {
    const response = await POST(
      postRequest({
        question: "this is system words.",
        history: [
          { role: "user", text: "What is S.C.O.R.E.?" },
          { role: "assistant", text: "S.C.O.R.E. helps small businesses run daily operations." },
        ],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(LIGHT_CHAT_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("returns Rural Technologies contact details without vector-store retrieval", async () => {
    const response = await POST(
      postRequest({
        question: "wonderful. chatbot. for more detail, please give me contact info with rural",
        history: [
          { role: "user", text: "How can I start?" },
          { role: "assistant", text: "Try the practice setup flow." },
        ],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe(RURAL_CONTACT_RESPONSE);
    expect(payload.grounded).toBe(false);
    expect(rewriteQuestionWithHistoryMock).not.toHaveBeenCalled();
    expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    expect(generateAnswerMock).not.toHaveBeenCalled();
  });

  it("keeps mixed acknowledgement plus product questions on the RAG path", async () => {
    retrieveRelevantChunksMock.mockResolvedValue([CHUNK]);
    generateAnswerMock.mockResolvedValue("Start with the practice setup flow.");
    rewriteQuestionWithHistoryMock.mockResolvedValue("How can I start with S.C.O.R.E.?");

    const history = [
      { role: "user" as const, text: "What is S.C.O.R.E.?" },
      { role: "assistant" as const, text: "S.C.O.R.E. helps small businesses run daily operations." },
    ];
    const response = await POST(postRequest({ question: "wonderful. how can I start?", history }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toBe("Start with the practice setup flow.");
    expect(rewriteQuestionWithHistoryMock).toHaveBeenCalledWith("wonderful. how can I start?", history);
    expect(retrieveRelevantChunksMock).toHaveBeenCalledWith({
      query: "How can I start with S.C.O.R.E.?",
      similarityThreshold: 0.35,
      maxChunks: 4,
    });
    expect(generateAnswerMock).toHaveBeenCalled();
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
    expect(generateAnswerMock).toHaveBeenCalledWith({
      question: "Does it work offline?",
      originalQuestion: "Does it work offline?",
      history: [],
      chunks: ALL_LIMITATIONS_CHUNKS,
    });
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
    retrieveChunksBySourcePathMock.mockRejectedValue(new Error("vector store down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("vector store down");
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

  it("degrades to the fallback when retrieval fails", async () => {
    retrieveRelevantChunksMock.mockRejectedValue(new Error("vector store down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("vector store down");
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
    it("short-circuits a bare greeting before calling the OpenAI pipeline", async () => {
      const response = await POST(postRequest({ question: "Hello" }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.answer).toBe(GREETING_RESPONSE);
      expect(payload.grounded).toBe(false);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
      expect(generateAnswerMock).not.toHaveBeenCalled();
    });

    it("does not treat a real question containing a greeting word as small talk", async () => {
      generateAnswerMock.mockResolvedValue("We don't have confirmed info on offline support yet.");

      const response = await POST(postRequest({ question: "Hi, does it work offline?" }));
      const payload = await response.json();

      expect(payload.answer).not.toBe(GREETING_RESPONSE);
      expect(generateAnswerMock).toHaveBeenCalledWith({
        question: "Hi, does it work offline?",
        originalQuestion: "Hi, does it work offline?",
        history: [],
        chunks: ALL_LIMITATIONS_CHUNKS,
      });
    });
  });

  describe("guardrails", () => {
    it("short-circuits sensitive-data submissions", async () => {
      const response = await POST(postRequest({ question: "My password is hunter2" }));
      const payload = await response.json();

      expect(payload.answer).toBe(SENSITIVE_DATA_RESPONSE);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    });

    it("short-circuits real-account modification requests", async () => {
      const response = await POST(postRequest({ question: "Can you access my real account?" }));
      const payload = await response.json();

      expect(payload.answer).toBe(REAL_ACCOUNT_RESPONSE);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    });

    it("short-circuits legal/tax/financial advice requests", async () => {
      const response = await POST(postRequest({ question: "Can you file my taxes?" }));
      const payload = await response.json();

      expect(payload.answer).toBe(LEGAL_FINANCIAL_ADVICE_RESPONSE);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
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
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    });

    it("returns 400 when history exceeds the turn limit", async () => {
      const history = Array.from({ length: MAX_HISTORY_TURNS + 1 }, () => ({ role: "user", text: "hi" }));
      const response = await POST(postRequest({ question: "How can I use it?", history }));
      expect(response.status).toBe(400);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    });

    it("returns 400 for a malformed history entry", async () => {
      const response = await POST(
        postRequest({ question: "How can I use it?", history: [{ role: "system", text: "x" }] })
      );
      expect(response.status).toBe(400);
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
    });

    it("rewrites a vague follow-up using history before vector-store retrieval", async () => {
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
      expect(retrieveRelevantChunksMock).toHaveBeenCalledWith({
        query: "How do I use inventory tracking?",
        similarityThreshold: 0.35,
        maxChunks: 4,
      });
      expect(generateAnswerMock).toHaveBeenCalledWith({
        question: "How do I use inventory tracking?",
        originalQuestion: "How can I use it?",
        history,
        chunks: [CHUNK],
      });
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
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
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
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
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
      expect(retrieveRelevantChunksMock).toHaveBeenCalledWith({
        query: "How much does the Pro plan cost?",
        similarityThreshold: 0.35,
        maxChunks: 4,
      });
      expect(generateAnswerMock).toHaveBeenCalledWith({
        question: "How much does the Pro plan cost?",
        originalQuestion: "What about the paid one?",
        history: [{ role: "user", text: "Does S.C.O.R.E. have a paid plan?" }],
        chunks: ALL_LIMITATIONS_CHUNKS,
      });
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

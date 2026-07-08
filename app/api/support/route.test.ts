import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStateForTests } from "@/lib/rag/rateLimit";
import { POST } from "./route";
import type { RetrievedChunk } from "@/lib/rag/types";
import {
  LEGAL_FINANCIAL_ADVICE_RESPONSE,
  REAL_ACCOUNT_RESPONSE,
  SENSITIVE_DATA_RESPONSE,
  UNSUPPORTED_FEATURE_RESPONSE,
} from "@/lib/rag/guardrails";

const embedQueryMock = vi.fn();
const retrieveRelevantChunksMock = vi.fn();
const generateAnswerMock = vi.fn();

vi.mock("@/lib/rag/embed", () => ({
  embedQuery: (...args: unknown[]) => embedQueryMock(...args),
}));
vi.mock("@/lib/rag/retrieve", () => ({
  retrieveRelevantChunks: (...args: unknown[]) => retrieveRelevantChunksMock(...args),
}));
vi.mock("@/lib/rag/generate", () => ({
  generateAnswer: (...args: unknown[]) => generateAnswerMock(...args),
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
  generateAnswerMock.mockReset();
  embedQueryMock.mockResolvedValue([0.1, 0.2]);
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

  it("returns the deterministic fallback and never calls Claude when zero chunks clear the threshold", async () => {
    retrieveRelevantChunksMock.mockResolvedValue([]);

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(payload.sources).toEqual([]);
    expect(generateAnswerMock).not.toHaveBeenCalled();
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
    embedQueryMock.mockRejectedValue(new Error("voyage down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("voyage down");
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
    generateAnswerMock.mockRejectedValue(new Error("anthropic down"));

    const response = await POST(postRequest({ question: "What is inventory?" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.grounded).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("anthropic down");
  });

  describe("guardrails", () => {
    it("short-circuits unsupported-feature questions before calling Voyage/Supabase/Claude", async () => {
      const response = await POST(postRequest({ question: "How much does Pro cost?" }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.answer).toBe(UNSUPPORTED_FEATURE_RESPONSE);
      expect(payload.grounded).toBe(false);
      expect(embedQueryMock).not.toHaveBeenCalled();
      expect(retrieveRelevantChunksMock).not.toHaveBeenCalled();
      expect(generateAnswerMock).not.toHaveBeenCalled();
    });

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

  describe("rate limiting", () => {
    it("returns 429 once the per-IP request limit is exceeded", async () => {
      retrieveRelevantChunksMock.mockResolvedValue([]);
      const headers = { "x-forwarded-for": "9.9.9.9" };

      let lastResponse;
      for (let i = 0; i < 21; i++) {
        lastResponse = await POST(postRequest({ question: "What is inventory?" }, headers));
      }

      expect(lastResponse?.status).toBe(429);
    });

    it("does not rate-limit a different IP", async () => {
      retrieveRelevantChunksMock.mockResolvedValue([]);
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

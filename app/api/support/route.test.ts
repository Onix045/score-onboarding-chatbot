import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { RetrievedChunk } from "@/lib/rag/types";

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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/support", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  embedQueryMock.mockReset();
  retrieveRelevantChunksMock.mockReset();
  generateAnswerMock.mockReset();
  embedQueryMock.mockResolvedValue([0.1, 0.2]);
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
});

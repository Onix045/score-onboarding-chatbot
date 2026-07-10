import { describe, expect, it } from "vitest";
import { detectConversationIntent } from "./intent";

describe("detectConversationIntent", () => {
  it("detects conversation-control messages", () => {
    expect(detectConversationIntent("hey, don't repeat answer")).toBe("conversation_control");
    expect(detectConversationIntent("Can you explain that differently?")).toBe("conversation_control");
    expect(detectConversationIntent("make it shorter")).toBe("conversation_control");
  });

  it("keeps product questions on the RAG path", () => {
    expect(detectConversationIntent("What is inventory tracking?")).toBe("product_question");
    expect(detectConversationIntent("How do I record a sale?")).toBe("product_question");
  });
});

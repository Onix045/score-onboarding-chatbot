import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatHistoryTurn } from "@/lib/rag/types";
import { useChatController, type ChatReply } from "./useChatController";

describe("useChatController", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("sends a message and appends the assistant reply with grounded state and sources", async () => {
    const replyFn = vi.fn<(userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>>().mockResolvedValue({
      text: "Inventory tracking explanation.",
      grounded: true,
      sources: [{ title: "Inventory tracking", category: "inventory" }],
    });

    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(replyFn).toHaveBeenCalledWith("What is inventory?", []);
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.text).toBe("Inventory tracking explanation.");
    expect(lastMessage.grounded).toBe(true);
    expect(lastMessage.sources).toEqual([{ title: "Inventory tracking", category: "inventory" }]);
  });

  it("ignores empty or whitespace-only input", () => {
    const replyFn = vi.fn<(userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>>();
    const { result } = renderHook(() => useChatController({ replyFn }));
    const initialCount = result.current.messages.length;

    act(() => {
      result.current.sendText("   ");
    });

    expect(result.current.messages).toHaveLength(initialCount);
    expect(replyFn).not.toHaveBeenCalled();
  });

  it("sets status to error on failure and supports retry", async () => {
    const replyFn = vi
      .fn<(userText: string) => Promise<ChatReply>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ text: "Recovered answer.", grounded: true, sources: [] });

    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(replyFn).toHaveBeenCalledTimes(2);
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.text).toBe("Recovered answer.");
  });

  it("includes prior turns as history on a follow-up message", async () => {
    const replyFn = vi
      .fn<(userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>>()
      .mockResolvedValueOnce({ text: "Inventory tracking explanation.", grounded: true, sources: [] })
      .mockResolvedValueOnce({ text: "You can add items from the inventory tab.", grounded: true, sources: [] });

    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    act(() => {
      result.current.sendText("How can I use it?");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(replyFn).toHaveBeenNthCalledWith(2, "How can I use it?", [
      { role: "user", text: "What is inventory?" },
      { role: "assistant", text: "Inventory tracking explanation." },
    ]);
  });

  it("restores stored conversation messages after a refresh", () => {
    window.localStorage.setItem(
      "score-chat-history-v1",
      JSON.stringify([
        { id: "user-1", role: "user", text: "What is S.C.O.R.E.?" },
        { id: "assistant-1", role: "assistant", text: "It helps run a small business.", grounded: true },
      ])
    );

    const { result } = renderHook(() => useChatController());

    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: "assistant" }),
      { id: "user-1", role: "user", text: "What is S.C.O.R.E.?" },
      { id: "assistant-1", role: "assistant", text: "It helps run a small business.", grounded: true },
    ]);
  });

  it("persists the conversation to localStorage", async () => {
    const replyFn = vi
      .fn<(userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>>()
      .mockResolvedValue({ text: "Answer.", grounded: true, sources: [] });

    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    const stored = JSON.parse(window.localStorage.getItem("score-chat-history-v1") ?? "[]") as Array<{
      role: string;
      text: string;
    }>;

    expect(stored.map((message) => ({ role: message.role, text: message.text }))).toEqual([
      { role: "assistant", text: expect.any(String) },
      { role: "user", text: "What is inventory?" },
      { role: "assistant", text: "Answer." },
    ]);
  });

  it("keeps sendText and retry referentially stable across messages", async () => {
    const replyFn = vi
      .fn<(userText: string, history: ChatHistoryTurn[]) => Promise<ChatReply>>()
      .mockResolvedValue({ text: "Answer.", grounded: true, sources: [] });

    const { result } = renderHook(() => useChatController({ replyFn }));
    const { sendText: sendTextBefore, retry: retryBefore } = result.current;

    act(() => {
      result.current.sendText("What is inventory?");
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(result.current.sendText).toBe(sendTextBefore);
    expect(result.current.retry).toBe(retryBefore);
  });

  it("restarts back to just the welcome message", async () => {
    const replyFn = vi
      .fn<(userText: string) => Promise<ChatReply>>()
      .mockResolvedValue({ text: "Answer.", grounded: true, sources: [] });
    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(1));

    act(() => {
      result.current.restart();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.status).toBe("idle");
    expect(window.localStorage.getItem("score-chat-history-v1")).toBeNull();
  });
});

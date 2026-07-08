import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChatController, type ChatReply } from "./useChatController";

describe("useChatController", () => {
  it("sends a message and appends the assistant reply with grounded state and sources", async () => {
    const replyFn = vi.fn<(userText: string) => Promise<ChatReply>>().mockResolvedValue({
      text: "Inventory tracking explanation.",
      grounded: true,
      sources: [{ title: "Inventory tracking", category: "inventory" }],
    });

    const { result } = renderHook(() => useChatController({ replyFn }));

    act(() => {
      result.current.sendText("What is inventory?");
    });

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(replyFn).toHaveBeenCalledWith("What is inventory?");
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.text).toBe("Inventory tracking explanation.");
    expect(lastMessage.grounded).toBe(true);
    expect(lastMessage.sources).toEqual([{ title: "Inventory tracking", category: "inventory" }]);
  });

  it("ignores empty or whitespace-only input", () => {
    const replyFn = vi.fn<(userText: string) => Promise<ChatReply>>();
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
  });
});

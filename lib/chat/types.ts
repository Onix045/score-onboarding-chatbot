export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

export type ChatPanelState = "closed" | "minimized" | "open";

export type ChatStatus = "idle" | "loading" | "error";

export interface QuickAction {
  id: string;
  label: string;
}

import { CHAT_BRAND } from "./brand";

type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getChatTheme() {
  return CHAT_BRAND;
}

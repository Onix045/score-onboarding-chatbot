export const KNOWLEDGE_CATEGORIES = [
  "overview",
  "inventory",
  "sales-pos",
  "crm",
  "reporting",
  "onboarding",
  "faq",
  "limitations",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === "string" && (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}

export interface RetrievedChunk {
  id: string;
  sourcePath: string;
  category: KnowledgeCategory;
  title: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  similarity: number;
}

export interface SourceCitation {
  title: string;
  category: KnowledgeCategory;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface SupportQuestionRequest {
  question: string;
  history?: ChatHistoryTurn[];
}

export interface SupportAnswer {
  answer: string;
  grounded: boolean;
  sources: SourceCitation[];
}

export interface ParsedKnowledgeFile {
  title: string;
  category: KnowledgeCategory;
  confirmed: true;
  body: string;
}

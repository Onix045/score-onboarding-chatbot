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

export interface DocumentChunk {
  id: string;
  sourcePath: string;
  category: KnowledgeCategory;
  title: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface RetrievedChunk extends DocumentChunk {
  similarity: number;
}

export interface SourceCitation {
  title: string;
  category: KnowledgeCategory;
}

export interface SupportQuestionRequest {
  question: string;
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

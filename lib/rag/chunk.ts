import type { DocumentChunk, KnowledgeCategory } from "./types";

// Heuristic estimator (chars / 4), not a real tokenizer — good enough for a
// chunking *boundary* decision, not for billing accuracy.
const TARGET_CHUNK_TOKENS = 350;
const MIN_CHUNK_TOKENS = 20;
const HEADING_PATTERN = /^(#{2,3})\s+(.+)$/;

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

interface Section {
  heading: string | null;
  content: string;
}

function splitIntoSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({ heading: currentHeading, content });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2].trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

/** Merges a section under the token floor into its neighbor rather than
 * embedding a stray heading as its own near-empty chunk. */
function mergeSmallSections(sections: Section[]): Section[] {
  const result: Section[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isTooSmall = estimateTokenCount(section.content) < MIN_CHUNK_TOKENS;
    const prefix = section.heading ? `## ${section.heading}\n\n` : "";

    if (isTooSmall && i + 1 < sections.length) {
      sections[i + 1] = {
        heading: sections[i + 1].heading,
        content: `${prefix}${section.content}\n\n${sections[i + 1].content}`,
      };
      continue;
    }

    if (isTooSmall && result.length > 0) {
      const previous = result[result.length - 1];
      result[result.length - 1] = {
        heading: previous.heading,
        content: `${previous.content}\n\n${prefix}${section.content}`,
      };
      continue;
    }

    result.push(section);
  }

  return result;
}

function splitByParagraphBudget(content: string): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const groups: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    if (current.length > 0 && currentTokens + paragraphTokens > TARGET_CHUNK_TOKENS) {
      groups.push(current.join("\n\n"));
      current = [];
      currentTokens = 0;
    }
    current.push(paragraph);
    currentTokens += paragraphTokens;
  }
  if (current.length > 0) {
    groups.push(current.join("\n\n"));
  }

  return groups;
}

export interface ChunkMeta {
  sourcePath: string;
  category: KnowledgeCategory;
  title: string;
}

/**
 * Pure Markdown -> DocumentChunk[] pipeline: no network, no embedding.
 * Splits by heading boundaries first, sub-splits an over-budget section by
 * paragraph group, and merges near-empty sections into their neighbor.
 */
export function chunkMarkdown(body: string, meta: ChunkMeta): DocumentChunk[] {
  const sections = mergeSmallSections(splitIntoSections(body));
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const withHeading = section.heading ? `## ${section.heading}\n\n${section.content}` : section.content;
    const pieces =
      estimateTokenCount(withHeading) > TARGET_CHUNK_TOKENS
        ? splitByParagraphBudget(withHeading)
        : [withHeading];

    for (const piece of pieces) {
      chunks.push({
        id: `${meta.sourcePath}#${chunkIndex}`,
        sourcePath: meta.sourcePath,
        category: meta.category,
        title: meta.title,
        chunkIndex,
        content: piece,
        tokenCount: estimateTokenCount(piece),
      });
      chunkIndex += 1;
    }
  }

  return chunks;
}

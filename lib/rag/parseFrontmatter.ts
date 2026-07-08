import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory, type ParsedKnowledgeFile } from "./types";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export class FrontmatterValidationError extends Error {}

function unquote(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Hand-rolled parser for the knowledge base's flat 3-field frontmatter
 * (title/category/confirmed). Deliberately not a YAML library — the format
 * is a fixed, tiny subset that doesn't justify a new dependency.
 */
export function parseFrontmatter(fileContent: string, sourcePath: string): ParsedKnowledgeFile {
  const match = FRONTMATTER_PATTERN.exec(fileContent);
  if (!match) {
    throw new FrontmatterValidationError(`${sourcePath}: missing frontmatter block`);
  }

  const [, frontmatterBlock, body] = match;
  const fields = new Map<string, string>();

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new FrontmatterValidationError(`${sourcePath}: malformed frontmatter line "${line}"`);
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = unquote(line.slice(separatorIndex + 1));
    fields.set(key, value);
  }

  const title = fields.get("title");
  if (!title) {
    throw new FrontmatterValidationError(`${sourcePath}: missing required "title" field`);
  }

  const category = fields.get("category");
  if (!category || !isKnowledgeCategory(category)) {
    throw new FrontmatterValidationError(
      `${sourcePath}: "category" must be one of ${KNOWLEDGE_CATEGORIES.join(", ")}, got "${category ?? ""}"`
    );
  }

  if (fields.get("confirmed") !== "true") {
    throw new FrontmatterValidationError(
      `${sourcePath}: "confirmed: true" is required for a file to be eligible for ingestion`
    );
  }

  return { title, category, confirmed: true, body: body.trim() };
}

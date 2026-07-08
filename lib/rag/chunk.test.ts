import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "./chunk";

const META = { sourcePath: "content/knowledge/test/example.md", category: "faq" as const, title: "Example" };

describe("chunkMarkdown", () => {
  it("splits by heading boundaries into one chunk per section", () => {
    const body = [
      "## First topic",
      "",
      "Some explanation about the first topic that is reasonably sized and contains enough detail to not be merged with any neighboring section.",
      "",
      "## Second topic",
      "",
      "Some explanation about the second topic that is also reasonably sized and contains enough detail to avoid being merged away.",
    ].join("\n");

    const chunks = chunkMarkdown(body, META);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain("## First topic");
    expect(chunks[1].content).toContain("## Second topic");
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    for (const chunk of chunks) {
      expect(chunk.sourcePath).toBe(META.sourcePath);
      expect(chunk.category).toBe(META.category);
      expect(chunk.title).toBe(META.title);
    }
  });

  it("merges a stray short section into the following section", () => {
    const body = [
      "## Tiny",
      "",
      "Ok.",
      "",
      "## Real topic",
      "",
      "This is a full explanation of the real topic with enough words to not be considered a stray section.",
    ].join("\n");

    const chunks = chunkMarkdown(body, META);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("Tiny");
    expect(chunks[0].content).toContain("Real topic");
  });

  it("merges a trailing stray section into the previous section", () => {
    const body = [
      "## Real topic",
      "",
      "This is a full explanation of the real topic with enough words to not be considered a stray section.",
      "",
      "## Tiny",
      "",
      "Ok.",
    ].join("\n");

    const chunks = chunkMarkdown(body, META);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("Real topic");
    expect(chunks[0].content).toContain("Tiny");
  });

  it("splits an over-budget section into multiple chunks by paragraph group", () => {
    const longParagraph = "word ".repeat(120).trim();
    const body = ["## Big topic", "", longParagraph, "", longParagraph, "", longParagraph].join("\n\n");

    const chunks = chunkMarkdown(body, META);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_, index) => index));
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(500);
    }
  });
});

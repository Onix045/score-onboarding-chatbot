import { describe, expect, it } from "vitest";
import { FrontmatterValidationError, parseFrontmatter } from "./parseFrontmatter";

const SOURCE_PATH = "content/knowledge/inventory/inventory-tracking.md";

describe("parseFrontmatter", () => {
  it("parses a valid file into title, category, confirmed, and body", () => {
    const file = [
      "---",
      'title: "Inventory tracking"',
      "category: inventory",
      "confirmed: true",
      "---",
      "",
      "## What is inventory?",
      "",
      "Inventory is what you have on hand.",
    ].join("\n");

    const parsed = parseFrontmatter(file, SOURCE_PATH);

    expect(parsed.title).toBe("Inventory tracking");
    expect(parsed.category).toBe("inventory");
    expect(parsed.confirmed).toBe(true);
    expect(parsed.body).toContain("## What is inventory?");
  });

  it("throws when the frontmatter block is missing", () => {
    expect(() => parseFrontmatter("## No frontmatter here", SOURCE_PATH)).toThrow(
      FrontmatterValidationError
    );
  });

  it("throws when category is not one of the approved categories", () => {
    const file = ["---", "title: Test", "category: pricing", "confirmed: true", "---", "Body"].join(
      "\n"
    );
    expect(() => parseFrontmatter(file, SOURCE_PATH)).toThrow(FrontmatterValidationError);
  });

  it("throws when confirmed is not exactly true", () => {
    const file = ["---", "title: Test", "category: faq", "confirmed: false", "---", "Body"].join("\n");
    expect(() => parseFrontmatter(file, SOURCE_PATH)).toThrow(FrontmatterValidationError);
  });

  it("throws when title is missing", () => {
    const file = ["---", "category: faq", "confirmed: true", "---", "Body"].join("\n");
    expect(() => parseFrontmatter(file, SOURCE_PATH)).toThrow(FrontmatterValidationError);
  });
});

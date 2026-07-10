import { join } from "node:path";
import { ingestKnowledgeBase } from "@/lib/rag/ingest";

const KNOWLEDGE_ROOT = join(process.cwd(), "content", "knowledge");

async function main() {
  const summary = await ingestKnowledgeBase(KNOWLEDGE_ROOT);
  console.log(`Vector store: ${summary.vectorStoreId}`);
  console.log(`Processed ${summary.filesProcessed} files.`);
  console.log(`Removed ${summary.filesRemoved} stale files.`);
  for (const result of summary.results) {
    console.log(`  ${result.sourcePath}: ${result.fileId}`);
  }
}

main().catch((error) => {
  console.error("Ingestion failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

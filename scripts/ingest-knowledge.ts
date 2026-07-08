import { join } from "node:path";
import { ingestKnowledgeBase } from "@/lib/rag/ingest";

const KNOWLEDGE_ROOT = join(process.cwd(), "content", "knowledge");

async function main() {
  const summary = await ingestKnowledgeBase(KNOWLEDGE_ROOT);
  console.log(`Processed ${summary.filesProcessed} files, wrote ${summary.chunksWritten} chunks.`);
  for (const result of summary.results) {
    console.log(`  ${result.sourcePath}: ${result.chunkCount} chunks`);
  }
}

main().catch((error) => {
  console.error("Ingestion failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

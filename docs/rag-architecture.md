# OpenAI Vector Store RAG Architecture — S.C.O.R.E. Support Chatbot

This document describes the current retrieval-augmented generation pipeline for the S.C.O.R.E. support chatbot.

## Product boundary

The chatbot may describe only the confirmed S.C.O.R.E. capabilities:

- inventory management;
- lightweight point-of-sale functionality;
- basic CRM;
- business reporting.

Everything else is treated as unconfirmed. Questions about pricing, payments, hardware, accounting, tax, integrations, legal/financial advice, real account access, or security claims must either be grounded in approved limitation content or receive a safe refusal/fallback.

## Runtime flow

1. The browser sends a message to `app/api/support/route.ts`.
2. The route validates input, rate-limits by IP, and handles deterministic greeting/guardrail cases.
3. If the message needs retrieval, query rewriting may produce a clearer standalone search query.
4. `lib/rag/retrieve.ts` searches the configured OpenAI vector store with a score threshold and a hard result cap.
5. Retrieved results are validated for required attributes: `sourcePath`, `category`, `title`, and content.
6. `lib/rag/generate.ts` generates a concise answer from the retrieved evidence and returns source labels.
7. If supported evidence is unavailable, the route falls back to the approved limitations content or the fixed safe fallback sentence.

Runtime requests require `OPENAI_VECTOR_STORE_ID`. They never create vector stores or mutate knowledge infrastructure.

## Ingestion flow

Knowledge files live in `content/knowledge/` and are the source of truth. Run:

```bash
npm run ingest
```

The ingestion script in `scripts/ingest-knowledge.ts` calls `lib/rag/ingest.ts`, which:

1. discovers Markdown files;
2. parses frontmatter and validates all local files before remote mutation;
3. resolves the OpenAI vector store for ingestion;
4. uploads each Markdown file to OpenAI;
5. attaches it to the vector store with metadata attributes;
6. uses OpenAI static chunking at 400 max tokens with 80 token overlap;
7. polls until vector-store processing completes;
8. deletes older managed versions only after the replacement succeeds;
9. removes stale files that were previously managed by this ingestion pipeline.

Managed vector-store files are marked with:

- `managedBy: "score-ingest"`
- `sourcePath`
- `category`
- `title`

## Environment variables

- `OPENAI_API_KEY` — server-only key for OpenAI calls.
- `OPENAI_VECTOR_STORE_ID` — required for runtime retrieval.
- `RAG_SIMILARITY_THRESHOLD` — optional score threshold, clamped to `0..1`.
- `RAG_MAX_CHUNKS` — optional retrieval cap, clamped to `1..4`.
- `RAG_RATE_LIMIT_MAX_REQUESTS` and `RAG_RATE_LIMIT_WINDOW_MS` — optional route rate-limit controls.
- `NEXT_PUBLIC_APP_URL` — public app URL; not a secret.

## Main implementation files

- `lib/clients/openai.ts` — OpenAI client, model constants, and vector-store ID helpers.
- `lib/rag/ingest.ts` — OpenAI vector-store ingestion and replacement logic.
- `lib/rag/retrieve.ts` — OpenAI vector-store search and metadata validation.
- `lib/rag/rewrite.ts` — query rewrite helper for follow-up questions.
- `lib/rag/generate.ts` — grounded answer generation.
- `app/api/support/route.ts` — API orchestration, validation, rate limiting, guardrails, and fallback behavior.
- `content/knowledge/` — approved Markdown knowledge base.

## Security and reliability rules

- OpenAI credentials stay server-only.
- Client code never calls OpenAI directly.
- Runtime retrieval is read-only.
- The chatbot must not claim to access or update a real S.C.O.R.E. account.
- The chatbot must not invent unconfirmed product details.
- API failures return a safe browser response and log only non-secret diagnostic information.

## Evaluation

Automated tests cover route behavior, retrieval validation, ingestion safety, guardrails, and golden-question routing with mocked boundaries. Manual quality checks are tracked in `docs/manual-evaluation-checklist.md`.

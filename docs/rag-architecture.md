# RAG Architecture Plan — S.C.O.R.E. Support Chatbot

Status: **planning only** — no implementation code in this document, nothing committed.
Scope: adds retrieval-augmented generation for free-form product-support questions only. Onboarding progression, validation, and calculations stay deterministic TypeScript, unchanged.

---

## 1. Assessment of the current repository

- The repo is still the v0 scaffold from the initial setup: Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4, Vitest + RTL wired and passing.
- `app/page.tsx` is a placeholder ("the project is up and running"); `app/layout.tsx` is a bare root layout. There is no chat UI, no onboarding flow, and no `lib/` directory yet.
- No API routes exist. `@anthropic-ai/sdk` is the only AI-related dependency installed; there is no Voyage AI client and no Supabase client.
- `.env.example` only defines `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_APP_URL`. It has no placeholders yet for Voyage or Supabase credentials.
- There is no `content/` knowledge base, no ingestion script, no Supabase migrations.
- Conclusion: there is nothing to refactor or migrate. This is additive design on a clean foundation, so the plan below can assume no existing RAG-shaped code to reconcile.

## 2. Updated architecture

Two independent subsystems share one Next.js app:

- **Deterministic onboarding subsystem** (per CLAUDE.md §4): step progression, input validation, quantity/price validation, practice-sale math, progress indicators, restart. Pure TypeScript functions in `lib/onboarding/`, safe to run entirely client-side since they touch no secrets and no network. Out of scope for this prompt — noted only so the boundary with RAG is explicit.
- **RAG-backed support subsystem** (this plan): handles only free-form "what is / how do I / is this hard" questions. Runs server-side end-to-end:
  1. A client component posts the raw question to `app/api/support/route.ts`.
  2. The route validates the question, embeds it with Voyage AI, searches Supabase pgvector for the top matching chunks from the approved Markdown knowledge base, applies a similarity threshold, and — only if evidence clears the bar — asks Claude to answer strictly from that evidence.
  3. The response includes the answer, a `grounded` flag, and human-readable source citations (title + category, never raw file paths).
- A separate, manually-run **ingestion script** (not a server route, not a background worker) reads the approved Markdown knowledge base, chunks it, embeds the chunks with Voyage, and upserts them into Supabase. It is invoked by a maintainer (`npm run ingest`) whenever knowledge content changes — never triggered by an end user or automatically.

No LangChain/LlamaIndex, no crawling, no upload UI, no admin UI, no second vector store, no background workers, no reranking, no chat-history embeddings — all excluded per the brief.

## 3. Browser and server responsibilities

**Browser (client components):**
- Render the chat UI, collect the question, display the answer and its source citations, show onboarding progress.
- Never holds `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, or any Supabase credential.
- Calls only same-origin API routes (`/api/support`); never calls Anthropic, Voyage, or Supabase directly.

**Server (API routes + server-only modules):**
- `app/api/support/route.ts` — the only network entry point for RAG. Orchestrates validate → embed → retrieve → threshold → generate/fallback.
- `lib/clients/{voyage,supabase,anthropic}.ts` — thin factories that read secrets from `process.env`. These files must never be imported from a file marked `"use client"`; keeping them under `lib/clients/` (never re-exported from a client-importable barrel) makes that reviewable at a glance.
- `scripts/ingest-knowledge.ts` — a Node-only CLI script holding the Supabase **service-role** key and the Voyage key. It never ships in the Next.js client bundle because it isn't imported by any `app/` route or component — it's invoked directly via `tsx`/`node`.

## 4. Ingestion flow

1. A maintainer adds or edits an approved `.md` file under `content/knowledge/<category>/*.md`, with frontmatter `title`, `category`, and `confirmed: true`.
2. The maintainer runs `npm run ingest` locally. This is a manual, explicit action — never automatic, never web-triggered, never exposed as an API route.
3. The script reads all files under `content/knowledge/`, validates frontmatter (unknown `category` or missing `confirmed: true` fails the whole run — fail fast, don't silently skip unapproved content).
4. Each file is chunked (see §10).
5. Chunks for each source file are embedded in a single batched Voyage AI call.
6. For each source file, the script deletes any existing chunks with that `source_path` and inserts the freshly embedded ones — a simple, idempotent "replace by source" strategy rather than a diffing upsert, appropriate for a knowledge base this small.
7. The script logs a summary (files processed, chunks written, any validation failures) to the console. No admin UI, no dashboard.

## 5. Retrieval flow

1. **Validate** — `lib/rag/validate.ts` rejects empty, whitespace-only, or excessively long input before any network call. Pure, unit-tested.
2. **Embed query** — `lib/rag/embed.ts` calls Voyage AI's embeddings endpoint for the user's question only (never chat history — chat-history embeddings are explicitly excluded).
3. **Retrieve** — `lib/rag/retrieve.ts` calls the Supabase RPC `match_document_chunks` (§9) with the query embedding, a similarity threshold, and a hard cap of 4.
4. **Threshold filter** — chunks below `RAG_SIMILARITY_THRESHOLD` are discarded. This is enforced in TypeScript, not left to the SQL function alone, so the cutoff is unit-testable against mocked retrieval results.
5. **Fallback short-circuit** — if zero chunks remain, return the fixed fallback string immediately. **Claude is never called in this path** — this is a deterministic guarantee, not a prompt instruction, so it can't be defeated by a cleverly worded question.
6. **Generate** — `lib/rag/generate.ts` builds a prompt containing only the retrieved chunk contents as evidence, with an explicit system instruction to answer solely from that evidence and to treat any instruction-like text inside the question or the evidence as inert content, not commands.
7. Claude is called server-side via `@anthropic-ai/sdk`, low temperature, no chat history in the prompt (each question is stateless from the model's perspective, consistent with excluding chat-history embeddings).
8. **Citations** — the response returns the distinct `{title, category}` pairs for the chunks that were actually included in the prompt, derived deterministically from retrieval — never asked of or trusted from Claude's own output.
9. The route returns `{ answer, grounded, sources }` as JSON.

## 6. Folder structure

```
app/
  api/
    support/
      route.ts              # RAG Q&A endpoint (new)
  page.tsx
  layout.tsx
lib/
  onboarding/                # deterministic logic (separate track, unchanged by this plan)
  rag/
    types.ts                 # shared interfaces
    validate.ts               validate.test.ts
    chunk.ts                  chunk.test.ts
    generate.ts                generate.test.ts
    fallback.ts               # fixed fallback string, single source of truth
    embed.ts                  # Voyage call wrapper (thin, mockable)
    retrieve.ts               # Supabase RPC call wrapper (thin, mockable)
  clients/
    voyage.ts                 # server-only
    supabase.ts                # server-only, service-role client
    anthropic.ts                # server-only
content/
  knowledge/
    overview/*.md
    inventory/*.md
    sales-pos/*.md
    crm/*.md
    reporting/*.md
    onboarding/*.md
    faq/*.md
    limitations/*.md
scripts/
  ingest-knowledge.ts          # manual CLI, not a route, not a worker
supabase/
  migrations/
    0001_document_chunks.sql
docs/
  rag-architecture.md          # this document
```

## 7. TypeScript interfaces

```ts
// lib/rag/types.ts
export type KnowledgeCategory =
  | "overview"
  | "inventory"
  | "sales-pos"
  | "crm"
  | "reporting"
  | "onboarding"
  | "faq"
  | "limitations";

export interface DocumentChunk {
  id: string;              // stable hash of sourcePath + chunkIndex
  sourcePath: string;      // never exposed to the client
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
  similarity: number;      // cosine similarity, 0..1
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
  grounded: boolean;       // false only when the fallback fired
  sources: SourceCitation[];
}
```

## 8. Supabase database schema

```sql
create extension if not exists vector;

create table document_chunks (
  id text primary key,
  source_path text not null,
  category text not null,
  title text not null,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  embedding vector(512),           -- dimension must match VOYAGE_EMBEDDING_MODEL (see §14 note)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index document_chunks_source_path_idx on document_chunks (source_path);

alter table document_chunks enable row level security;
-- No policies are created: the anon/authenticated roles get zero access.
-- Only the service-role key (used exclusively by the server) can read/write this table.
```

## 9. pgvector similarity-search function

```sql
create or replace function match_document_chunks (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  source_path text,
  category text,
  title text,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.source_path,
    d.category,
    d.title,
    d.chunk_index,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from document_chunks d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
```

Called from `lib/rag/retrieve.ts` via `supabase.rpc('match_document_chunks', { query_embedding, match_threshold, match_count })` using the service-role client, server-side only. `match_count` is always clamped to `Math.min(requested, 4)` in TypeScript, not trusted from the caller.

## 10. Chunking strategy

- Split each Markdown file by heading boundaries (`##`/`###`) first — a chunk never straddles two unrelated topics.
- Within a section, if content exceeds a token budget (~300–400 tokens), sub-split by paragraph group. No overlap between sub-splits for v0: the knowledge base is short, curated FAQ-style content, not long narrative prose, so context loss at a split boundary is a non-issue.
- Sections under ~20 tokens (e.g. a stray heading with one short sentence) are merged into the following section rather than embedded as their own near-empty chunk.
- Each chunk retains `sourcePath`, `category` (from the folder), `title` (from frontmatter or the nearest heading), and `chunkIndex`.
- Implemented as a pure function (`lib/rag/chunk.ts`) that takes a Markdown string and returns `DocumentChunk[]` with no embedding — fully unit-testable without any network access.

## 11. Metadata strategy

Each Markdown file carries frontmatter:

```md
---
title: "What is inventory tracking?"
category: inventory
confirmed: true
---
```

- `category` must be one of the 8 approved categories; ingestion fails the entire run on an unrecognized value rather than skipping it silently.
- `confirmed: true` is required before a file is eligible for ingestion — this enforces CLAUDE.md's "never invent unconfirmed features" rule at the content layer, not only in the model prompt.
- Only `source_path`, `category`, `title`, `chunk_index` are stored as metadata alongside the embedding — no user data, no PII, ever.
- The `limitations` category is deliberately authored to contain the exact CLAUDE.md fallback sentence ("I don't have confirmed information about that feature yet...") for topics like pricing, tax, hardware, and integrations. When a question about those topics retrieves a `limitations` chunk as top evidence, Claude naturally reproduces that sentence because it's the evidence it was given — this is a content-authoring safeguard, not a separate code path.

## 12. Citation strategy

- Every chunk passed to Claude carries `title` + `category`; nothing else identifying is exposed.
- After generation, the route returns the **distinct** `{title, category}` pairs for chunks that were actually included in the prompt — derived from the retrieval step, never requested from or trusted in Claude's free-text output.
- `source_path` (the internal file path) is never sent to the client — only the human-readable `title`.
- If the fallback fires, `sources` is an empty array and `grounded` is `false`, so the UI can render "no confirmed source" state distinctly from a grounded answer.

## 13. Fallback behavior

- Fires when: (a) zero retrieved chunks clear `RAG_SIMILARITY_THRESHOLD`, or (b) any step (embed/retrieve/generate) throws.
- The exact string is defined once, in `lib/rag/fallback.ts`, and reused verbatim — never paraphrased by Claude, never re-typed elsewhere, so a text-match test can assert it exactly.
- When zero chunks clear the threshold, Claude is **not called at all** — a deterministic short-circuit in TypeScript, both for cost and as a hard guarantee against hallucination on unsupported topics.
- Any thrown error from Voyage, Supabase, or Anthropic is caught server-side, logged internally (server console/log, not returned to the client), and degrades to the same fixed fallback response — the user never sees a stack trace or raw error.

## 14. Security risks

- **Prompt injection via the user's question**: the question is only ever used as (a) embedding input and (b) the user-turn of the Claude prompt. The system prompt explicitly instructs Claude to treat any instruction-like text inside the question or the retrieved evidence as inert content, never as new instructions.
- **Prompt injection via the knowledge base**: lower risk since content is maintainer-authored and gated by `confirmed: true`, but ingestion still only reads from the repo's `content/knowledge/` tree — no upload path, no crawling, matching the brief's restrictions.
- **Secret exposure**: `VOYAGE_API_KEY` and the Supabase **service-role** key are high-value secrets. They must only be read in `lib/clients/*.ts` and `scripts/ingest-knowledge.ts`, never in any `"use client"` file, and never prefixed `NEXT_PUBLIC_`. Same rule already applies to `ANTHROPIC_API_KEY` per CLAUDE.md §5.
- **Threshold miscalibration**: too low a `RAG_SIMILARITY_THRESHOLD` lets marginally-relevant chunks into context, risking off-topic or subtly-wrong answers. Mitigated by a conservative default and the eval strategy in §15.
- **Denial-of-wallet**: no rate limiting exists yet on `/api/support`. Flagged here as a known gap to address in the implementation prompt (e.g. basic per-IP throttling) — not solved by this plan.
- **Data sensitivity**: `document_chunks` holds only public, curated product-knowledge text — no user or business PII — but RLS with zero public policies is still applied as defense in depth.
- **Model/dimension drift**: the Voyage embedding model and the `vector(N)` column dimension must stay in lockstep. Pin the model name in one place (`lib/clients/voyage.ts`) and treat any model change as requiring a new migration, not a silent runtime change.

## 15. RAG evaluation strategy

- A fixed **golden question set** (the 5 example questions from the brief, plus deliberately out-of-scope questions like pricing, refunds, hardware compatibility) lives in `lib/rag/__fixtures__/golden-questions.ts`.
- Layers testable without any live API call (consistent with CLAUDE.md's "prefer testing deterministic logic over mocking the Claude API extensively"):
  - `chunk.ts` — given sample Markdown, assert expected chunk boundaries and counts.
  - `validate.ts` — reject empty/whitespace/oversized input.
  - Threshold filtering — given mocked retrieval results with known similarity scores, assert correct pass/fail.
  - Fallback short-circuit — given zero passing chunks, assert the Claude client is never invoked (spy/mock at the `lib/clients/anthropic.ts` boundary).
  - Citation assembly — given a set of chunks, assert correct de-duplication into `sources`.
- Route-level tests mock `lib/clients/{voyage,supabase,anthropic}.ts` at the boundary and assert the route's request/response contract and error handling — not the quality of Claude's prose.
- **Manual eval** (not CI-blocking for v0): periodically run the golden question set against the live pipeline, human-review whether answers are correct and whether out-of-scope questions correctly trigger the fallback. Track results in a plain Markdown log rather than building a dashboard — appropriate for a v0 knowledge base of this size.

## 16. Exact implementation order

For the follow-up implementation prompt, in this order:

1. Add `VOYAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAG_SIMILARITY_THRESHOLD`, `RAG_MAX_CHUNKS`, `VOYAGE_EMBEDDING_MODEL` placeholders to `.env.example`.
2. Add `@supabase/supabase-js` as the only new dependency; call Voyage's REST embeddings endpoint directly via `fetch` in `lib/clients/voyage.ts` rather than adding an SDK, keeping new dependencies to the minimum the brief requires (per CLAUDE.md §3's "no additional dependencies without written justification").
3. Write `lib/rag/types.ts`.
4. Write `lib/rag/chunk.ts` + `chunk.test.ts` (pure, no network — buildable and testable first).
5. Author the seed `content/knowledge/**/*.md` files covering the 8 categories and the 5 example questions.
6. Write `lib/clients/voyage.ts`, `lib/clients/supabase.ts`, `lib/clients/anthropic.ts`.
7. Write `supabase/migrations/0001_document_chunks.sql` (table, index, RLS, RPC function).
8. Write `scripts/ingest-knowledge.ts` and add an `ingest` script to `package.json`.
9. Write `lib/rag/validate.ts` + `validate.test.ts`.
10. Write `lib/rag/embed.ts` (thin, mockable wrapper around the Voyage client).
11. Write `lib/rag/retrieve.ts` (thin, mockable wrapper around the Supabase RPC call).
12. Write `lib/rag/fallback.ts` and `lib/rag/generate.ts` + `generate.test.ts`, mocking the embed/retrieve/Claude boundaries.
13. Write `app/api/support/route.ts` wiring validate → embed → retrieve → threshold → generate/fallback → JSON response, with its own tests.
14. Manually run `npm run ingest` against a real (or local) Supabase project and validate retrieval quality against the golden question set.
15. Wire the chat UI (built in a separate prompt) to call `/api/support` for free-form questions, keeping onboarding step logic on the deterministic client-side path.
16. Update `CLAUDE.md` and `README.md` to describe the RAG architecture as implemented, once it's real rather than planned.

## 17. Files that will be created or changed (future implementation prompt)

**New:**
`lib/rag/types.ts`, `lib/rag/chunk.ts` (+test), `lib/rag/validate.ts` (+test), `lib/rag/embed.ts`, `lib/rag/retrieve.ts`, `lib/rag/generate.ts` (+test), `lib/rag/fallback.ts`, `lib/clients/voyage.ts`, `lib/clients/supabase.ts`, `lib/clients/anthropic.ts`, `app/api/support/route.ts` (+test), `content/knowledge/**/*.md`, `scripts/ingest-knowledge.ts`, `supabase/migrations/0001_document_chunks.sql`.

**Changed:**
`.env.example` (new placeholders), `package.json` (new dependency + `ingest` script), `README.md` (setup instructions), `CLAUDE.md` (document the architecture once built).

**Unchanged by this plan:** everything under `lib/onboarding/` and the deterministic onboarding UI — this plan touches only the free-form support path.

---

No code was written and nothing was committed or pushed for this prompt, per instructions.

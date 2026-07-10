# score-onboarding-chatbot

Onboarding and support chatbot prototype for S.C.O.R.E. — plain-language guidance for first-time small business users.

## What this project does

- Presents a small S.C.O.R.E. landing/demo experience.
- Runs deterministic onboarding logic in TypeScript, not in the LLM.
- Answers free-form support questions through a Next.js API route.
- Grounds support answers in approved Markdown files under `content/knowledge/`.
- Uses OpenAI vector stores for managed knowledge retrieval.

Confirmed S.C.O.R.E. features are intentionally narrow: inventory management, lightweight point-of-sale, basic CRM, and reporting. Pricing, payments, hardware, accounting, tax, security certifications, offline mode, and similar topics are unconfirmed unless the knowledge files explicitly say otherwise.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Set at least:

```bash
OPENAI_API_KEY=
OPENAI_VECTOR_STORE_ID=
```

`OPENAI_VECTOR_STORE_ID` is required at runtime. For ingestion/setup, `npm run ingest` can reuse an existing vector store by this ID, or create/reuse one named by `VECTOR_STORE_NAME` in `lib/clients/openai.ts` when the ID is not set.

## Knowledge ingestion

```bash
npm run ingest
```

The ingestion script:

- validates and parses all local Markdown knowledge files before remote mutation;
- uploads each source file to OpenAI;
- attaches it to the vector store with `sourcePath`, `category`, `title`, and `managedBy` attributes;
- waits for OpenAI processing to complete;
- then removes older managed versions and stale managed files.

Runtime support requests are read-only against the configured vector store.

## Development commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run build
```

No external database or local database is required.

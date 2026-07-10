# score-onboarding-chatbot

Onboarding and support chatbot prototype for S.C.O.R.E. — plain-language guidance for first-time small business users.

## What this project does

- Presents a small S.C.O.R.E. landing/demo experience.
- Embeds a simple chat widget for first-time small-business users.
- Runs deterministic onboarding logic in TypeScript, not in the LLM.
- Answers free-form support questions through a Next.js API route.
- Grounds support answers in approved Markdown files under `content/knowledge/`.
- Uses OpenAI vector stores for managed knowledge retrieval.

Confirmed S.C.O.R.E. features are intentionally narrow: inventory management, lightweight point-of-sale, basic CRM, and reporting. Pricing, payments, hardware, accounting, tax, security certifications, offline mode, and similar topics are unconfirmed unless the knowledge files explicitly say otherwise.

## Technology used

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- OpenAI SDK, Responses API, and OpenAI vector stores
- Vitest and React Testing Library

## How the chatbot works

The frontend never calls OpenAI directly. It sends the current message plus recent conversation history to `app/api/support/route.ts`.

The API route:

1. validates request shape, supported message roles, message length, and history size;
2. applies lightweight rate limiting;
3. handles greetings, conversation-control messages, and safety guardrails deterministically;
4. rewrites follow-up questions when needed so retrieval has enough context;
5. searches the configured OpenAI vector store;
6. generates a short, friendly answer with the OpenAI Responses API;
7. returns a safe fallback if OpenAI or retrieval fails.

The selected OpenAI model is configured in `lib/clients/openai.ts`.

## Conversation context

The chat keeps recent conversation history in the browser and sends it with each support request. This is enough for prototype follow-up behavior such as "what do I do next?" or "don't repeat that."

History is persisted in `localStorage`, so messages remain after a page refresh. The clear-history icon removes stored chat history and resets onboarding state.

The backend trims accepted history to keep requests bounded. There is no production database and no long-term user memory.

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

## Deployment notes

This project is ready for a serverless Next.js host such as Netlify or Vercel.

Before deploying:

1. Set `OPENAI_API_KEY` in the hosting platform environment variables.
2. Set `OPENAI_VECTOR_STORE_ID` to the vector store containing the ingested S.C.O.R.E. knowledge.
3. Keep `.env.local` out of git and out of deployment artifacts.
4. Run `npm run build` locally or in CI.

No Supabase credentials are required for the current implementation.

## Design decisions

- A lightweight backend route protects the OpenAI API key and keeps model configuration server-side.
- Deterministic TypeScript handles onboarding form progression so product quantities and sale practice steps behave predictably.
- OpenAI vector stores are used because this implementation already migrated retrieval away from Supabase and benefits from managed file search over the Markdown knowledge base.
- Conversation context uses recent frontend history plus server-side trimming instead of a database, because the trial only needs session-level continuity.

## Prototype limitations

- This is not a full production S.C.O.R.E. account experience.
- The chatbot cannot access or update a real business account.
- Rate limiting is in-memory and suitable only for a small prototype/serverless instance.
- Knowledge updates require running the ingestion command.
- There is no user authentication, payment flow, production database, or long-term user memory.
- Unsupported product details should be added to `content/knowledge/` and re-ingested before the chatbot can answer them confidently.

## Submission summary

The project implements a clean standalone S.C.O.R.E. onboarding page with a friendly chat widget, secure server-side OpenAI integration, local conversation persistence, deterministic starter onboarding, and managed vector-store retrieval over approved knowledge. The solution stays intentionally lightweight for the RURAL Technologies trial while documenting what would need to become more robust for production.

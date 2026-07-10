# Manual Evaluation Checklist — S.C.O.R.E. Support Chatbot

**Status: manual and optional.** Not CI-blocking — the automated golden-question
suite (`lib/rag/goldenQuestions.test.ts`) covers routing logic against mocked
boundaries. This checklist is for a human to periodically run against the real,
deployed pipeline (real OpenAI credentials and vector store) to judge answer
*quality*, which automated tests can't score.

## Desktop chat behavior

- [ ] Chat launcher opens/minimizes/closes correctly
- [ ] Clear-history icon clears the conversation back to the welcome message
- [ ] Quick action buttons send their label as a question
- [ ] Long answers render without breaking layout

## Mobile chat behavior

- [ ] Chat panel fills the screen appropriately on a small viewport
- [ ] On-screen keyboard doesn't obscure the input field
- [ ] No noisy source labels or internal retrieval details appear in the chat UI

## Keyboard-only behavior

- [ ] Tab order reaches the launcher, header buttons, message input, and quick actions
- [ ] Enter sends a message; Shift+Enter inserts a newline
- [ ] Focus rings are visible on every interactive element

## Onboarding flow

- [ ] Deterministic onboarding steps never call the LLM for progression/validation
- [ ] Clear-history behavior resets onboarding state, not just chat messages

## RAG — supported questions

Run each of the golden "positive" questions (`lib/rag/__fixtures__/golden-questions.ts`)
against the live pipeline and judge:

- [ ] Answer is accurate relative to `content/knowledge/`
- [ ] Answer is short, plain, and jargon-free
- [ ] The visible answer stays simple while API-level source metadata remains available for debugging/evaluation
- [ ] A vague follow-up ("How can I use it?" after asking about inventory) resolves to a grounded answer instead of the fallback
- [ ] Conversation-control messages such as "good", "I know", and "don't repeat that" receive natural context-aware replies instead of repeating the previous answer

## RAG — unsupported questions

Run each of the golden "unsupported" and "adversarial" questions and judge:

- [ ] unsupported-feature questions (pricing, hardware, tax, etc.) get a real, natural-language generated answer — not the identical canned sentence every time — but never invent a specific the limitations content doesn't contain
- [ ] real-account / legal-financial questions still get the exact fixed response (these are deterministic guardrail refusals, not generated)
- [ ] The literal fixed fallback sentence ("I don't have confirmed information...") never appears during normal use — only a real API failure should produce it
- [ ] No pricing, integration, hardware, or trial-terms claims are invented
- [ ] No system-prompt or instruction leakage under any adversarial phrasing

## API failure behavior

- [ ] Temporarily using an invalid `OPENAI_API_KEY` or `OPENAI_VECTOR_STORE_ID`
      still returns the safe fallback, never a raw error, to the browser
- [ ] Server logs show which upstream failed (OpenAI rewrite/OpenAI vector search/OpenAI generation) without any secret value

## Deployment verification

- [ ] `npm run build` succeeds in the deployment environment
- [ ] Environment variables are set in the hosting platform, not committed
- [ ] `.env.local` is not present in the deployed artifact

# Sprint v12 Tasks

- [x] Task 1: Add job-posting memory and compaction database contracts (P0)
  - Acceptance: Migration creates `agent_memory_items` and `agent_memory_summaries` with employer/job/session scope, RLS, indexes, and updated-at triggers.
  - Files: `supabase/migrations/20260428000000_job_posting_agent_memory.sql`, `tests/supabase/job-posting-agent-memory-migration.test.ts`
  - Completed: 2026-04-27 — Added memory + summary tables, owner-scoped RLS, indexes, and migration contract tests.

- [x] Task 2: Add scoped memory retrieval and compaction utility layer (P0)
  - Acceptance: Utilities support memory insert/list/summary upsert, lexical retrieval ranking, compact summary generation, and prompt-safe rendering.
  - Files: `src/lib/agents/job-posting/memory.ts`, `tests/agents/job-posting/memory.test.ts`
  - Completed: 2026-04-27 — Added deterministic memory derivation, retrieval scoring, summary compaction thresholds, and focused unit coverage.

- [x] Task 3: Add persistent job-detail chat revision API (P0)
  - Acceptance: Employer-only API revises the same draft from chat turns, returns updated session/job/messages/memory, and preserves authorization boundaries.
  - Files: `src/app/api/employer/jobs/[id]/agent-chat/route.ts`, `tests/app/api/employer/jobs/agent-chat-route.test.ts`
  - Completed: 2026-04-27 — Added job-scoped chat route with role enforcement, structured payload handling, and route contract tests.

- [x] Task 4: Extend follow-up orchestration to support chat-turn revision with memory and RAG (P0)
  - Acceptance: Chat turn flow loads/creates session, retrieves scoped memory, revises draft, persists messages/traces, and updates memory summary/items.
  - Files: `src/lib/agents/job-posting/follow-up.ts`, `src/lib/agents/job-posting/persistence.ts`, `tests/agents/job-posting/persistence.test.ts`
  - Completed: 2026-04-27 — Added `reviseEmployerJobDraftFromChatTurn`, session message listing helper, memory integration, and persistence coverage updates.

- [x] Task 5: Add persistent JD chat UI to employer job detail surface (P0)
  - Acceptance: `/employer/jobs/[id]` always shows JD chat, memory/readiness state, and allows iterative agent revisions without leaving the page.
  - Files: `src/components/employer-job-agent-chat.tsx`, `src/app/employer/jobs/[id]/page.tsx`, `src/app/globals.css`
  - Completed: 2026-04-27 — Added job-detail chat component, server data wiring, and styling for chat thread/composer/memory/readiness sections.

- [ ] Task 6: Full E2E chat-turn regression on real employer credentials (P1)
  - Acceptance: Playwright verifies chat updates on job detail page and publish remains manual-gated.
  - Files: `tests/e2e/*`
  - Blocked: Requires configured E2E employer credentials and runtime env.

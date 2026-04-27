# Sprint v7 Tasks

- [x] Task 1: Set up sprint v7 artifacts and scope alignment (P0)
  - Acceptance: `sprints/v7/PRD.md` and `sprints/v7/TASKS.md` exist with goals, architecture, dependencies, and atomic tasks.
  - Files: `sprints/v7/PRD.md`, `sprints/v7/TASKS.md`
  - Completed: 2026-04-25

- [x] Task 2: Add Perplexity-backed web search tool (P0)
  - Acceptance: A server-side `web_search_tool` exists under `tools/` with env-driven config, request/response validation, and failure handling.
  - Files: `tools/web_search_tool.ts`, `.env.example`, `tests/tools/web-search-tool.test.ts`
  - Completed: 2026-04-25

- [x] Task 3: Add job creator capability catalog for skills and tools (P0)
  - Acceptance: Job creator prompt assembly includes declared skills and tools catalog instructions; no undeclared tool use.
  - Files: `src/lib/agents/job-posting/capabilities.ts`, `src/lib/agents/job-posting/prompts.ts`, `tests/agents/job-posting/capabilities.test.ts`, `tests/agents/job-posting/prompt-assembly.test.ts`
  - Completed: 2026-04-25

- [x] Task 4: Extend agent output contract for transparent reasoning/action fields (P0)
  - Acceptance: Structured output includes `reasoningSummary`, `thinkingMessages`, and `actionLog` with schema validation and inference JSON schema updates.
  - Files: `src/lib/agents/job-posting/schema.ts`, `src/lib/agents/job-posting/inference.ts`, `tests/agents/job-posting/schema.test.ts`, `tests/agents/job-posting/inference.test.ts`, `tests/agents/job-posting/follow-up.test.ts`
  - Completed: 2026-04-25

- [x] Task 5: Persist and surface transparency fields in employer review UI (P1)
  - Acceptance: Agent metadata persists transparency arrays and employer job detail page shows latest session reasoning/action panels.
  - Files: `src/lib/agents/job-posting/create-draft.ts`, `src/lib/agents/job-posting/persistence.ts`, `src/app/employer/jobs/[id]/page.tsx`, `tests/employer/job-agent-action.test.ts`
  - Completed: 2026-04-25

- [x] Task 6: Add template SKILL.md for job creator skill usage (P1)
  - Acceptance: A template skill doc exists in `skills/` that defines usage conditions, guardrails, inputs, outputs, and tool integration pattern.
  - Files: `skills/job-creator-template/SKILL.md`
  - Completed: 2026-04-25

- [x] Task 7: Implement true token-by-token UI streaming transport (SSE/chunked) for thinking messages (P1)
  - Acceptance: Employer composer view updates `thinkingMessages` in real time during inference, not only after completion.
  - Files: `src/app/employer/jobs/new/page.tsx`, `src/app/employer/jobs/actions.ts`, `src/lib/agents/job-posting/inference.ts`, `tests/e2e/`
  - Completed: 2026-04-25 — Added SSE route transport with chunked `thinking_token` events, client-side stream parser/rendering in the employer composer, inference fallback thinking-message helper, and Playwright coverage for stream panel/status. Ran targeted Vitest, Playwright spec (skipped without employer creds), Semgrep, and npm audit.

- [x] Task 8: Add E2E coverage for transparency rendering and stream behavior (P2)
  - Acceptance: Playwright tests verify reasoning/action panels and streaming-state UX for success and provider error cases.
  - Files: `tests/e2e/`, `tests/screenshots/`
  - Completed: 2026-04-25 — Added Playwright coverage for successful and error SSE stream behavior with deterministic route interception, plus stable stream output test ids in the composer. Executed targeted Playwright run (skipped without employer credentials), Semgrep, and npm audit.

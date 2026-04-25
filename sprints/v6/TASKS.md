# Sprint v6 Tasks

- [x] Task 1: Add job posting agent domain contracts (P0)
  - Acceptance: Tests define structured agent input/output, field provenance, assumptions, missing critical fields, and conversion into `EmployerJobInput`.
  - Files: `tests/agents/job-posting/schema.test.ts`, `src/lib/agents/job-posting/schema.ts`
  - Completed: 2026-04-25 — Added schema contracts, runtime validation, conversion into `EmployerJobInput`, focused Vitest coverage, Semgrep scan, npm audit, and graph rebuild.

- [x] Task 2: Add OpenAI server client configuration (P0)
  - Acceptance: Server-only helper reads `OPENAI_API_KEY` and `OPENAI_MODEL`, defaults to `gpt-5.5`, rejects missing keys, and never exposes secrets through public config.
  - Files: `tests/agents/job-posting/openai-config.test.ts`, `src/lib/agents/job-posting/openai-client.ts`, `.env.example`
  - Completed: 2026-04-25 — Added server-only OpenAI config defaults, API key validation, request header helper, `.env.example` default model alignment, focused Vitest coverage, Semgrep scan, npm audit, and graph rebuild.

- [ ] Task 3: Add model availability preflight (P0)
  - Acceptance: A server helper checks the configured model against OpenAI's models endpoint and returns a clear unavailable-model error instead of silently using another model.
  - Files: `tests/agents/job-posting/model-preflight.test.ts`, `src/lib/agents/job-posting/openai-client.ts`

- [ ] Task 4: Add prompt version and assembly layer (P0)
  - Acceptance: Tests verify prompt assembly separates system policy, product instructions, tool/output rules, and untrusted employer prompt content.
  - Files: `tests/agents/job-posting/prompt-assembly.test.ts`, `src/lib/agents/job-posting/prompts.ts`

- [ ] Task 5: Add live job posting inference service (P0)
  - Acceptance: Service calls the real OpenAI Responses API in production mode, parses structured JSON, validates required fields, and reports provider response id and model used.
  - Files: `tests/agents/job-posting/inference.test.ts`, `src/lib/agents/job-posting/inference.ts`

- [ ] Task 6: Add agent session persistence migration and helpers (P0)
  - Acceptance: SQL creates owner-scoped tables for job agent sessions, messages, assumptions, and execution traces with RLS; helpers insert and load employer-owned sessions.
  - Files: `supabase/migrations/20260425000001_job_posting_agent.sql`, `tests/agents/job-posting/persistence.test.ts`, `src/lib/agents/job-posting/persistence.ts`

- [ ] Task 7: Add prompt-first job creation server action (P0)
  - Acceptance: Employer prompt creates an agent session, calls inference, persists trace metadata, and creates or updates an `employer_jobs` draft without requiring manual department, level, or location input.
  - Files: `tests/employer/job-agent-action.test.ts`, `src/app/employer/jobs/actions.ts`, `src/lib/agents/job-posting/create-draft.ts`

- [ ] Task 8: Replace create-job form with conversational composer (P1)
  - Acceptance: `/employer/jobs/new` shows a single hiring prompt composer, generated draft state, assumptions, and no mandatory department or level fields before generation.
  - Files: `src/app/employer/jobs/new/page.tsx`, `src/app/globals.css`, `tests/e2e/v6-job-posting-agent.spec.ts`

- [ ] Task 9: Add targeted follow-up handling (P1)
  - Acceptance: When critical fields are missing, the agent asks at most three targeted questions and can revise the same draft after employer answers.
  - Files: `tests/agents/job-posting/follow-up.test.ts`, `src/lib/agents/job-posting/follow-up.ts`, `src/app/employer/jobs/actions.ts`

- [ ] Task 10: Validate real inference and record results (P1)
  - Acceptance: Focused Vitest, Playwright, Next build, Semgrep, npm audit, and an explicit OpenAI preflight/inference smoke test are run; results are recorded here with no secret values.
  - Files: `sprints/v6/TASKS.md`

# Sprint v13 Tasks

- [x] Task 1: Add failing schema tests for Step 1 role profile contracts (P0)
  - Acceptance: Tests define required normalized fields, unresolved constraints shape, conflict entries, and confidence bounds.
  - Files: `tests/agents/job-posting/role-profile.test.ts`
  - Completed: 2026-04-27 — Added red-first role profile contract tests covering required normalized fields, unresolved constraints validation, conflict schema validation, confidence-bound checks, and deterministic normalization expectations. Verified failing state with targeted Vitest run due to missing `role-profile` module.

- [x] Task 2: Implement role profile normalization and conflict detection module (P0)
  - Acceptance: `role-profile.ts` normalizes employer intent into deterministic profile fields and emits explicit conflict records.
  - Files: `src/lib/agents/job-posting/role-profile.ts`, `tests/agents/job-posting/role-profile.test.ts`
  - Completed: 2026-04-27 — Implemented deterministic role profile extraction/normalization, conflict detection, schema validation, and current-profile merge behavior in `role-profile.ts`. Verified with targeted Vitest, plus clean Semgrep and npm audit runs.

- [x] Task 3: Add failing tests for requirement discovery and clarification prioritization (P0)
  - Acceptance: Tests enforce max 3 clarification questions, critical-gap prioritization, and suppression of redundant questions.
  - Files: `tests/agents/job-posting/requirement-discovery.test.ts`
  - Completed: 2026-04-27 — Added red-first requirement discovery contract tests covering bounded (max 3) clarifications, deterministic critical-gap ordering, session-level duplicate suppression, and no-gap behavior. Verified failing state with targeted Vitest run due to missing `requirement-discovery` module.

- [x] Task 4: Implement requirement discovery and bounded clarification logic (P0)
  - Acceptance: `requirement-discovery.ts` returns prioritized clarifications and update instructions from role-profile gaps/conflicts.
  - Files: `src/lib/agents/job-posting/requirement-discovery.ts`, `tests/agents/job-posting/requirement-discovery.test.ts`
  - Completed: 2026-04-27 — Implemented deterministic requirement-discovery logic with conflict/constraint question generation, priority ordering, max-3 clarification cap, duplicate suppression by session history, and explicit update-instruction outputs. Verified with targeted Vitest, plus clean Semgrep and npm audit runs.

- [x] Task 5: Add failing tests for Step 2 quality-control contracts (P0)
  - Acceptance: Tests cover completeness, readability, discriminatory phrasing checks, contradiction checks, and pass/warn/fail statuses.
  - Files: `tests/agents/job-posting/quality-controls.test.ts`
  - Completed: 2026-04-27 — Added red-first quality-control contract tests for deterministic completeness, readability, discriminatory-language, and contradiction checks including pass/warn/fail outcomes, readiness flags, and rewrite guidance expectations. Verified failing state with targeted Vitest run due to missing `quality-controls` module.

- [x] Task 6: Implement deterministic JD quality-control engine (P0)
  - Acceptance: `quality-controls.ts` evaluates generated draft + normalized profile and returns structured quality findings with rewrite guidance.
  - Files: `src/lib/agents/job-posting/quality-controls.ts`, `tests/agents/job-posting/quality-controls.test.ts`
  - Completed: 2026-04-27 — Implemented deterministic quality-control evaluator with completeness/readability/discriminatory-phrasing/requirement-contradiction checks, consistent pass|warn|fail aggregation, and readiness flags. Verified with targeted Vitest plus clean Semgrep and npm audit runs.

- [x] Task 7: Add Supabase migration + contract tests for role profile persistence (P0)
  - Acceptance: Migration creates `employer_job_role_profiles` with employer/job/session scope, indexes, updated_at trigger, and RLS.
  - Files: `supabase/migrations/20260429000000_employer_job_role_profiles.sql`, `tests/supabase/employer-job-role-profiles-migration.test.ts`
  - Completed: 2026-04-27 — Added red-first migration contract tests and implemented `employer_job_role_profiles` migration with employer/job/session-scoped schema, owner-enforced RLS policies, scope index, and updated_at trigger. Verified with targeted Vitest plus clean Semgrep and npm audit runs.

- [x] Task 8: Add Supabase migration + contract tests for quality check persistence (P0)
  - Acceptance: Migration creates `employer_job_quality_checks` with typed check fields, scoped indexes, updated_at trigger, and RLS.
  - Files: `supabase/migrations/20260429000001_employer_job_quality_checks.sql`, `tests/supabase/employer-job-quality-checks-migration.test.ts`
  - Completed: 2026-04-27 — Added red-first migration contract tests and implemented `employer_job_quality_checks` migration with typed `check_type`/`status` constraints, owner-scoped RLS policies, scoped indexes, and updated_at trigger. Verified with targeted Vitest plus clean Semgrep and npm audit runs.

- [x] Task 9: Implement persistence helpers for role profile and quality check artifacts (P0)
  - Acceptance: Create/list/upsert helpers enforce employer/job/session scope and typed inserts/reads for new tables.
  - Files: `src/lib/agents/job-posting/step1-step2-persistence.ts`, `tests/agents/job-posting/step1-step2-persistence.test.ts`
  - Completed: 2026-04-27 — Added red-first persistence contract tests and implemented typed Step 1/2 persistence helpers for role-profile upsert/load and quality-check create/list paths with strict employer/job/session scoping. Verified with targeted Vitest plus clean Semgrep and npm audit runs.

- [x] Task 10: Extend prompt assembly to include normalized profile + quality policy blocks (P0)
  - Acceptance: Prompt assembly includes role profile, unresolved constraints, quality policy instructions, and untrusted-input isolation.
  - Files: `src/lib/agents/job-posting/prompts.ts`, `tests/agents/job-posting/prompt-assembly.test.ts`
  - Completed: 2026-04-27 — Added red-first prompt-assembly coverage and implemented optional developer-layer prompt blocks for normalized role profile, unresolved constraints, and quality-check findings with explicit untrusted-input isolation rules. Verified with targeted Vitest plus clean Semgrep and npm audit runs.

- [x] Task 11: Add orchestration tests for chat-turn Step 1+2 integration (P0)
  - Acceptance: Tests verify chat turn updates role profile, runs quality controls, persists artifacts, and keeps draft revision deterministic.
  - Files: `tests/agents/job-posting/follow-up.test.ts`
  - Completed: 2026-04-27 — Added red-first chat-turn orchestration coverage requiring Step 1/2 integration behavior: deterministic scoped revision prompt path plus persistence expectations for role-profile and quality-check artifacts. Verified failing state with targeted Vitest run showing missing `employer_job_role_profiles` and `employer_job_quality_checks` writes.

- [x] Task 12: Implement Step 1+2 integration in chat-turn revision flow (P0)
  - Acceptance: `reviseEmployerJobDraftFromChatTurn` incorporates role profile normalization, requirement discovery, and quality checks every turn.
  - Files: `src/lib/agents/job-posting/follow-up.ts`, `src/lib/agents/job-posting/memory.ts`
  - Completed: 2026-04-27 — Integrated Step 1/2 execution into chat-turn orchestration: deterministic role-profile normalization, clarification discovery, quality-check evaluation, and persistence writes to role-profile and quality-check artifact tables on every turn. Verified with targeted follow-up orchestration tests plus focused Step 1/2 unit tests, Semgrep clean, and npm audit clean.

- [x] Task 13: Extend agent chat API response contract for Step 1+2 artifacts (P0)
  - Acceptance: `/api/employer/jobs/[id]/agent-chat` returns `roleProfileSummary`, `qualityChecks`, and `readinessFlags` with backward-compatible request.
  - Files: `src/app/api/employer/jobs/[id]/agent-chat/route.ts`, `tests/app/api/employer/jobs/agent-chat-route.test.ts`
  - Completed: 2026-04-27 — Added red-first API contract coverage and extended agent chat route responses with `roleProfileSummary`, `qualityChecks`, and `readinessFlags` while preserving existing request/response compatibility and providing safe defaults when optional artifacts are absent. Verified with targeted API + follow-up Vitest runs, Semgrep clean, and npm audit clean.

- [x] Task 14: Add job-detail UI sections for role profile and quality warnings (P1)
  - Acceptance: Employer job detail chat panel renders normalized role profile summary, quality findings, and fix guidance.
  - Files: `src/components/employer-job-agent-chat.tsx`, `src/app/globals.css`
  - Completed: 2026-04-27 — Added red-first UI coverage and implemented job-detail chat sections for role-profile summary, unresolved constraints, quality findings, rewrite guidance, and readiness warning messaging; added supporting styles for quality status cards and key-value profile layout. Verified with targeted Vitest, Semgrep clean, and npm audit clean.

- [x] Task 15: Gate review readiness by critical Step 2 failures (P1)
  - Acceptance: UI clearly blocks or warns before `needs_review` when critical quality failures remain, without bypassing manual approval model.
  - Files: `src/app/employer/jobs/[id]/page.tsx`, `src/lib/employer/jobs.ts`, `tests/employer/job-workflow.test.ts`
  - Completed: 2026-04-27 — Added deterministic review-gate helper that blocks draft-to-review when any Step 2 check is `fail`, preserves warning-only pass-through for `warn`, and wired job detail page to load latest quality artifacts, surface gating message, and disable `Mark Ready For Review` accordingly. Verified with targeted Vitest, Semgrep clean, and npm audit clean.

- [x] Task 16: Add focused E2E for Step 1+2 chat refinement flow (P1)
  - Acceptance: Playwright verifies iterative chat refinement, clarification loop, quality warning resolution, and explicit review/publish gating.
  - Files: `tests/e2e/v13-step1-step2-job-refinement.spec.ts`
  - Completed: 2026-04-27 — Added focused Playwright coverage for prompt-first job creation, blocked refinement turn, clarification prompt surfacing, quality-warning resolution, and review/publish gating. Added deterministic `E2E_AGENT_STUB_MODE` server path plus stable test ids so the flow is reproducible without live model variance. Verified spec discovery with `npx playwright test --list`; full browser execution was blocked locally by missing employer E2E credentials and sandbox port-permission failure on `127.0.0.1:3000`.

- [x] Task 17: Run validation suite and refresh graph artifacts (P0)
  - Acceptance: Targeted Vitest, selected Playwright, build, and graph rebuild complete; failures documented in task notes if blocked by env.
  - Commands: `npx vitest run tests/agents/job-posting tests/app/api/employer/jobs tests/supabase/*role* tests/supabase/*quality*`, `npm run build`, `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`
  - Completed: 2026-04-27 — Ran targeted validation suite: `82` focused Vitest checks passed across job-posting, API, and migration coverage; `npm run build` passed; Semgrep and `npm audit --audit-level=high` were clean; graph artifacts rebuilt successfully. Selected Playwright validation was executed with `E2E_AGENT_STUB_MODE=true` and skipped cleanly because employer E2E credentials were not present in the environment.

# Sprint v14 Tasks

- [x] Task 1: Add v14 pipeline setup tests and shared fixtures (P0)
  - Acceptance: Shared fixtures define the three pipeline stages, stage-state vocabulary, and baseline interview blueprint payload used across unit and UI tests.
  - Files: `tests/agents/job-posting/pipeline-fixtures.ts`, `tests/components/employer-job-detail-pipeline.test.ts`
  - Completed: 2026-04-27 — Added reusable v14 pipeline fixtures covering the three stage definitions, shared state vocabulary, and baseline interview blueprint defaults, plus setup coverage verifying those contracts. Verified with targeted Vitest, Semgrep clean, and `npm audit --audit-level=high` clean.

- [x] Task 2: Add failing tests for pipeline stage-state contracts (P0)
  - Acceptance: Tests cover `current`, `complete`, `blocked`, and `upcoming` states plus Stage 1 to Stage 2 progression rules.
  - Files: `tests/agents/job-posting/pipeline-state.test.ts`
  - Completed: 2026-04-27 — Added red-first contract coverage for pipeline stage ordering, current/complete/blocked/upcoming states, and Stage 1 to Stage 2 progression into review readiness. Verified failing state with targeted Vitest run due to missing `job-pipeline` module.

- [ ] Task 3: Implement deterministic pipeline stage-state helper (P0)
  - Acceptance: `job-pipeline.ts` derives stage order, labels, completion, and blocker summaries from job + quality + interview blueprint state.
  - Files: `src/lib/agents/job-posting/job-pipeline.ts`, `tests/agents/job-posting/pipeline-state.test.ts`

- [ ] Task 4: Add failing tests for interview blueprint schema and validation (P0)
  - Acceptance: Tests enforce required fields for response mode, tone profile, parsing strategy, benchmark summary, and ordered questions.
  - Files: `tests/agents/job-posting/interview-blueprint.test.ts`

- [ ] Task 5: Implement interview blueprint schema and validation module (P0)
  - Acceptance: `interview-blueprint.ts` normalizes interview structure inputs, validates allowed enum values, and emits completeness gaps.
  - Files: `src/lib/agents/job-posting/interview-blueprint.ts`, `tests/agents/job-posting/interview-blueprint.test.ts`

- [ ] Task 6: Add failing migration tests for interview blueprint persistence (P0)
  - Acceptance: Tests require employer/job-scoped blueprint and question tables, indexes, updated-at triggers, and owner RLS.
  - Files: `tests/supabase/employer-job-interview-blueprints-migration.test.ts`

- [ ] Task 7: Implement interview blueprint Supabase migration (P0)
  - Acceptance: Migration creates `employer_job_interview_blueprints` and `employer_job_interview_questions` with scoped constraints and RLS.
  - Files: `supabase/migrations/20260430000000_employer_job_interview_blueprints.sql`, `tests/supabase/employer-job-interview-blueprints-migration.test.ts`

- [ ] Task 8: Add failing tests for interview blueprint persistence helpers (P0)
  - Acceptance: Tests cover create, update, list, and job-scoped question ordering with strict employer ownership.
  - Files: `tests/agents/job-posting/interview-blueprint-persistence.test.ts`

- [ ] Task 9: Implement interview blueprint persistence helpers (P0)
  - Acceptance: Helper functions read and write blueprint and question records with typed job/employer scoping.
  - Files: `src/lib/agents/job-posting/interview-blueprint-persistence.ts`, `tests/agents/job-posting/interview-blueprint-persistence.test.ts`

- [ ] Task 10: Add failing tests for stage-aware agent/chat response contracts (P0)
  - Acceptance: API tests require `activeStage`, `stageSummary`, and `interviewBlueprintSummary` in job chat responses without breaking existing clients.
  - Files: `tests/app/api/employer/jobs/agent-chat-route.test.ts`

- [ ] Task 11: Implement stage-aware orchestration and response metadata (P0)
  - Acceptance: Job chat orchestration surfaces stage-targeted recommendations and returns pipeline/interview blueprint summaries with safe defaults.
  - Files: `src/lib/agents/job-posting/follow-up.ts`, `src/app/api/employer/jobs/[id]/agent-chat/route.ts`, `src/lib/agents/job-posting/prompts.ts`

- [ ] Task 12: Add failing UI tests for employer job-detail pipeline shell (P1)
  - Acceptance: Tests verify a visible status bar, active-stage switching, and blocked Stage 3 behavior when Stage 1 or Stage 2 is incomplete.
  - Files: `tests/components/employer-job-detail-pipeline.test.tsx`

- [ ] Task 13: Implement top-level status bar and stage-aware job detail layout (P1)
  - Acceptance: Employer job detail page renders the three-stage pipeline header and shows stage-specific content instead of one flat workspace.
  - Files: `src/app/employer/jobs/[id]/page.tsx`, `src/app/globals.css`

- [ ] Task 14: Add failing UI tests for interview structure design panel (P1)
  - Acceptance: Tests cover question rows, response mode selector, tone selector, parsing strategy selector, benchmark summary, and readiness hints.
  - Files: `tests/components/employer-interview-blueprint-panel.test.tsx`

- [ ] Task 15: Implement interview structure design panel and server action wiring (P1)
  - Acceptance: Employers can edit and save interview blueprint data and ordered questions from Stage 2 with validation errors surfaced in UI.
  - Files: `src/components/employer-interview-blueprint-panel.tsx`, `src/app/employer/jobs/actions.ts`, `src/app/employer/jobs/[id]/page.tsx`, `src/app/globals.css`

- [ ] Task 16: Add failing tests for combined review gate behavior (P1)
  - Acceptance: Tests require Stage 3 review to stay blocked when critical JD failures remain or interview blueprint completeness gaps are unresolved.
  - Files: `tests/employer/job-workflow.test.ts`

- [ ] Task 17: Implement combined review gate across job posting and interview design (P1)
  - Acceptance: Review controls aggregate Stage 1 quality blockers and Stage 2 completeness blockers before enabling `Mark Ready For Review`.
  - Files: `src/lib/employer/jobs.ts`, `src/app/employer/jobs/[id]/page.tsx`, `tests/employer/job-workflow.test.ts`

- [ ] Task 18: Add focused E2E for staged job-posting pipeline flow (P1)
  - Acceptance: Playwright verifies Stage 1 drafting, Stage 2 interview-design completion, and Stage 3 review gating in one employer flow.
  - Files: `tests/e2e/v14-job-posting-pipeline.spec.ts`

- [ ] Task 19: Run targeted validation suite and refresh graph artifacts (P0)
  - Acceptance: Relevant Vitest, Playwright, build, and graph rebuild commands complete, or blockers are documented in task notes.
  - Commands: `npx vitest run tests/agents/job-posting tests/components tests/app/api/employer/jobs tests/employer/job-workflow.test.ts`, `npx playwright test tests/e2e/v14-job-posting-pipeline.spec.ts`, `npm run build`, `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`

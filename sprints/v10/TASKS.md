# Sprint v10 Tasks

- [x] Task 1: Set up sprint v10 artifacts and Step 4 completion scope (P0)
  - Acceptance: `sprints/v10/PRD.md` and `sprints/v10/TASKS.md` clearly define remaining Step 4 completion goals and boundaries.
  - Files: `sprints/v10/PRD.md`, `sprints/v10/TASKS.md`
  - Completed: 2026-04-27 — Verified v10 PRD/TASKS artifacts exist and clearly map remaining Step 4 scope (scoring calibration, filter/sort workspace, quality metrics, retries) with explicit boundaries.

- [x] Task 2: Add candidate scoring schema and persistence fields (P0)
  - Acceptance: Data contracts and migrations add requirement-fit dimension scores, aggregate score, score version, and evidence snippets scoped by employer/job.
  - Files: `supabase/migrations/*_candidate_scoring.sql`, `src/lib/agents/candidate-intake/schema.ts`, `tests/agents/candidate-intake/schema.test.ts`
  - Completed: 2026-04-27 — Added candidate scoring migration (`20260427000000_candidate_scoring.sql`) and schema contracts/validation for requirement-fit dimension scores, aggregate score, score version, and evidence snippets.

- [x] Task 3: Implement requirement-fit scoring calibration service (P0)
  - Acceptance: Scoring service maps job requirements + candidate profile into deterministic score dimensions with confidence-aware weighting and validation.
  - Files: `src/lib/agents/candidate-intake/scoring.ts`, `tests/agents/candidate-intake/scoring.test.ts`
  - Completed: 2026-04-27 — Added deterministic requirement-fit scoring calibration service with confidence-aware weighting, evidence snippet generation, and schema-backed output validation.

- [x] Task 4: Persist score outputs and score audit metadata (P0)
  - Acceptance: Candidate profile persistence writes calibrated score fields, score version id, and evidence summary without storing raw hidden reasoning.
  - Files: `src/lib/agents/candidate-intake/persistence.ts`, `tests/agents/candidate-intake/persistence.test.ts`
  - Completed: 2026-04-27 — Updated candidate profile persistence to store requirement-fit scores, aggregate score, score version, and evidence snippets plus bounded score-audit metadata while explicitly avoiding hidden reasoning trace fields.

- [x] Task 5: Add candidate workspace filter/sort query layer (P0)
  - Acceptance: Query helpers support owner/job-scoped filtering by status, skill, confidence threshold, and score-based sorting.
  - Files: `src/lib/agents/candidate-intake/persistence.ts`, `tests/agents/candidate-intake/persistence.test.ts`
  - Completed: 2026-04-27 — Added owner/job-scoped intake status filtering and candidate profile query helper with skill filter, overall-confidence threshold filter, and score-based sorting options.

- [x] Task 6: Add employer candidate workspace filter/sort UI controls (P1)
  - Acceptance: `/employer/jobs/[id]/candidates` includes functional controls for status/skill/confidence/sort and renders results deterministically.
  - Files: `src/app/employer/jobs/[id]/candidates/page.tsx`, `src/app/globals.css`, `tests/employer/candidate-pages.test.ts`
  - Completed: 2026-04-27 — Added candidate workspace filter controls (status, skill, min confidence, sort), wired query params to filtered profile queries, and rendered deterministic scored candidate rows with regression coverage.

- [x] Task 7: Add extraction quality metrics contracts and storage (P1)
  - Acceptance: Quality metrics capture validation failures, normalization repair counts, and extraction completion/failure counters per job scope.
  - Files: `supabase/migrations/*_candidate_extraction_metrics.sql`, `src/lib/agents/candidate-intake/metrics.ts`, `tests/agents/candidate-intake/metrics.test.ts`
  - Completed: 2026-04-27 — Added owner/job-scoped extraction metrics migration and metrics helper module for writing/listing metrics plus aggregate quality summaries (validation failures, normalization repairs, success/failure counters).

- [x] Task 8: Add bounded extraction retry workflow (P1)
  - Acceptance: Failed candidate extraction records can be retried through server action with bounded attempts and explicit failure reason tracking.
  - Files: `src/app/employer/jobs/actions.ts`, `src/lib/agents/candidate-intake/extraction.ts`, `tests/employer/candidate-intake-action.test.ts`
  - Completed: 2026-04-27 — Added bounded candidate extraction retry flow (2 attempts), explicit failure-reason extraction helpers, and extraction metrics writes for both success and failure paths with attempt-count and retry repair metadata.

- [x] Task 9: Add privacy/authorization regressions for scoring and filters (P1)
  - Acceptance: Tests verify owner/job scoping for score fields and filters, no leaked internal metadata, and prompt context minimization preserved.
  - Files: `tests/auth/enforce-route-access.test.ts`, `tests/agents/candidate-intake/*.test.ts`, `tests/employer/candidate-pages.test.ts`
  - Completed: 2026-04-27 — Added regressions for owner/job scope enforcement in candidate profile lookups, candidate workspace auth redirects for scored/filter routes, prompt payload minimization (no tenant/scoring internals), and UI non-leakage of internal scoring audit metadata.

- [x] Task 10: Add focused E2E and quality checks for scored candidate workspace (P2)
  - Acceptance: Playwright covers filtered/sorted candidate workspace and retry path denial/authorization; focused Vitest/build/Semgrep/audit outcomes recorded here.
  - Files: `tests/e2e/v10-candidate-workspace.spec.ts`, `tests/screenshots/`, `sprints/v10/TASKS.md`
  - Completed: 2026-04-27 — Added Playwright coverage for employer candidate workspace filter/sort query controls and job-seeker denial on employer retry-filter routes. Also fixed a build-blocking type guard issue in `src/lib/agents/candidate-intake/persistence.ts` uncovered by quality checks.
  - Validation:
    - `npx playwright test tests/e2e/v10-candidate-workspace.spec.ts` (2 skipped in this environment; requires real Supabase E2E credentials and runtime env)
    - `npx vitest run tests/employer/candidate-pages.test.ts tests/auth/enforce-route-access.test.ts tests/employer/candidate-intake-action.test.ts` (pass)
    - `npx vitest run tests/agents/candidate-intake/persistence.test.ts` (pass)
    - `npm run build` (pass)
    - `npx semgrep --config auto src/ --quiet` (pass)
    - `npm audit` (pass, 0 vulnerabilities)

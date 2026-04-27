# Sprint v9 Tasks

- [x] Task 1: Set up sprint v9 artifacts and Step 4 scope alignment (P0)
  - Acceptance: `sprints/v9/PRD.md` and `sprints/v9/TASKS.md` exist, align with `Architecture_Design.md` Step 4, and define explicit split for remaining Step 4 work.
  - Files: `sprints/v9/PRD.md`, `sprints/v9/TASKS.md`
  - Completed: 2026-04-26 — Verified v9 artifacts exist, map to Step 4 candidate intake scope, and document explicit v9/v10 split.

- [x] Task 2: Add candidate intake and profile persistence migrations with RLS (P0)
  - Acceptance: Supabase migrations create owner-scoped tables for candidate intake and structured profiles linked to employer jobs; read/write policies enforce `auth.uid() = employer_user_id`.
  - Files: `supabase/migrations/*_candidate_intake_profiles.sql`
  - Completed: 2026-04-26 — Added candidate intake/profile migration with owner-scoped RLS read/write policies and supporting indexes/triggers; validated with `tests/supabase/candidate-intake-migration.test.ts`.

- [x] Task 3: Add candidate domain contracts and schema validators (P0)
  - Acceptance: Runtime schema contracts define candidate intake payload, extraction output, profile confidence fields, and persistence DTOs; malformed payloads fail deterministically.
  - Files: `src/lib/agents/candidate-intake/schema.ts`, `tests/agents/candidate-intake/schema.test.ts`
  - Completed: 2026-04-26 — Added runtime validators for intake payload, extraction output confidence fields, and persistence DTOs with deterministic failure ordering; validated by `tests/agents/candidate-intake/schema.test.ts`.

- [x] Task 4: Add secure candidate upload/storage helper layer (P0)
  - Acceptance: Server-only helper generates deterministic employer/job-scoped storage paths, validates file metadata/type limits, and blocks unauthorized writes.
  - Files: `src/lib/agents/candidate-intake/storage.ts`, `tests/agents/candidate-intake/storage.test.ts`
  - Completed: 2026-04-26 — Added deterministic employer/job-scoped candidate resume path planning with MIME/size validation and owner-write authorization checks; validated by `tests/agents/candidate-intake/storage.test.ts`.

- [x] Task 5: Add candidate extraction prompt assembly and OpenAI extraction service (P0)
  - Acceptance: Extraction service builds scoped prompts from allowed candidate content only, calls OpenAI structured output, and returns validated normalized profile objects plus extraction metadata.
  - Files: `src/lib/agents/candidate-intake/prompts.ts`, `src/lib/agents/candidate-intake/extraction.ts`, `tests/agents/candidate-intake/extraction.test.ts`
  - Completed: 2026-04-26 — Added scoped candidate extraction prompt assembly and OpenAI structured-output extraction service with schema validation, normalization, and metadata return; validated by `tests/agents/candidate-intake/extraction.test.ts`.

- [x] Task 6: Add candidate persistence helpers and audit metadata wiring (P0)
  - Acceptance: Helpers persist candidate intake records and extracted profiles, including model id, response id, prompt checksum, and per-field confidence values.
  - Files: `src/lib/agents/candidate-intake/persistence.ts`, `tests/agents/candidate-intake/persistence.test.ts`
  - Completed: 2026-04-26 — Added candidate intake/profile persistence helpers with owner/job scoped list query and audit metadata mapping (`model_id`, `provider_response_id`, `prompt_checksum`, confidence JSON); validated by `tests/agents/candidate-intake/persistence.test.ts`.

- [x] Task 7: Add employer candidate intake server actions (P0)
  - Acceptance: Employer-only server actions create candidate intake records, trigger extraction flow, and redirect to candidate profile review; unauthorized users are blocked.
  - Files: `src/app/employer/jobs/actions.ts`, `tests/employer/candidate-intake-action.test.ts`
  - Completed: 2026-04-26 — Added employer-only candidate intake server action that validates inputs, enforces owner scope, creates intake records, runs extraction, persists profile metadata, and redirects to candidate review; unauthorized job seeker access is redirected/blocked.

- [x] Task 8: Add employer candidate intake and profile review routes (P1)
  - Acceptance: `/employer/jobs/[id]/candidates` lists candidates for a job and supports intake; `/employer/jobs/[id]/candidates/[candidateId]` shows structured profile and confidence fields.
  - Files: `src/app/employer/jobs/[id]/candidates/page.tsx`, `src/app/employer/jobs/[id]/candidates/[candidateId]/page.tsx`, `src/app/globals.css`
  - Completed: 2026-04-26 — Added candidate intake/list route and candidate profile review route with owner/job scoping, structured confidence rendering, and intake form wiring to server action; validated by `tests/employer/candidate-pages.test.ts`.

- [x] Task 9: Add authorization/privacy regression coverage (P1)
  - Acceptance: Unit/integration tests verify employer ownership enforcement, job-to-candidate scoping, minimized extraction context, and no candidate raw secrets in UI or logs.
  - Files: `tests/auth/enforce-route-access.test.ts`, `tests/agents/candidate-intake/*.test.ts`, `tests/employer/candidate-pages.test.ts`
  - Completed: 2026-04-26 — Added regressions for nested employer candidate route access, scoped candidate profile not-found behavior, extraction payload minimization, and UI secrecy checks (no raw candidate contact/storage path or internal response/checksum exposure); validated across candidate/auth test suites.

- [x] Task 10: Add focused E2E and quality checks for candidate intake flow (P2)
  - Acceptance: Playwright covers candidate intake happy path + unauthorized route denial; run focused Vitest, build, Semgrep, and npm audit with outcomes recorded in this file.
  - Files: `tests/e2e/v9-candidate-intake.spec.ts`, `tests/screenshots/`, `sprints/v9/TASKS.md`
  - Completed: 2026-04-26 — Added Playwright spec `tests/e2e/v9-candidate-intake.spec.ts` covering unauthorized candidate-route denial and employer candidate-intake workspace flow (runtime-gated by Supabase env/credentials).
  - Quality Checks:
    - `npx playwright test tests/e2e/v9-candidate-intake.spec.ts --config playwright.manual.config.ts` → 2 skipped (missing `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` and/or E2E employer credentials in this environment).
    - `npx vitest run tests/auth/enforce-route-access.test.ts tests/agents/candidate-intake/*.test.ts tests/employer/candidate-intake-action.test.ts tests/employer/candidate-pages.test.ts` → 33 passed.
    - `npm run build` → passed (after fixing candidate MIME allowlist typing in `src/lib/agents/candidate-intake/storage.ts`).
    - `npx semgrep --config auto src/ --quiet` → clean.
    - `npm audit --audit-level=moderate` → found 0 vulnerabilities.

- [x] Task 11: Prepare Step 4 follow-on backlog split for v10 (P2)
  - Acceptance: Remaining Step 4 scope is documented with atomic backlog items for scoring calibration, search/filter UX, extraction quality metrics, and operational retries.
  - Files: `sprints/v10/PRD.md` (or backlog note in `sprints/v9/TASKS.md` if v10 artifacts are not created yet)
  - Completed: 2026-04-27 — Created `sprints/v10/PRD.md` and `sprints/v10/TASKS.md` with atomic Step 4 completion backlog covering scoring calibration, candidate workspace filters/sorting, extraction quality metrics, and bounded retry workflows.

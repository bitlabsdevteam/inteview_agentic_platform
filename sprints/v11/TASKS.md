# Sprint v11 Tasks

- [x] Task 1: Confirm v11 employer recruiting assistant scope and artifacts (P0)
  - Acceptance: `PRD.md` and `TASKS.md` frame v11 as an employer-only personal recruiting assistant foundation, not a standalone screening utility, and preserve human decision checkpoints.
  - Files: `sprints/v11/PRD.md`, `sprints/v11/TASKS.md`
  - Completed: 2026-04-27 — Validated and finalized v11 as Step 5A employer personal recruiting assistant scope, including explicit human-checkpoint constraints and deferral of candidate-facing answer submission to v12.

- [x] Task 2: Add employer assistant recommendation schema contracts (P0)
  - Acceptance: Schema module validates recommendation action, rationale, evidence references, risk flags, screening kit payloads, and deterministic validation errors.
  - Files: `src/lib/agents/employer-assistant/schema.ts`, `tests/agents/employer-assistant/schema.test.ts`
  - Completed: 2026-04-27 — Added employer assistant recommendation schema contracts with deterministic validation and test coverage for valid/invalid payloads (including optional screening kit handling).

- [x] Task 3: Add employer assistant prompt version and assembly layer (P0)
  - Acceptance: Prompt assembly uses versioned metadata, includes only scoped employer job/candidate context, and separates untrusted candidate/profile content from assistant instructions.
  - Files: `src/lib/agents/employer-assistant/prompts.ts`, `tests/agents/employer-assistant/prompts.test.ts`
  - Completed: 2026-04-27 — Added versioned employer assistant prompt assembly with scoped context sanitization, untrusted context isolation tags, and deterministic identifier validation.

- [x] Task 4: Add employer assistant recommendation migration (P0)
  - Acceptance: Migration creates owner/job/candidate-scoped `employer_assistant_recommendations` storage with action, rationale, evidence, risk flags, prompt audit, and RLS-ready fields.
  - Files: `supabase/migrations/*_employer_assistant_recommendations.sql`, `tests/supabase/employer-assistant-recommendations-migration.test.ts`
  - Completed: 2026-04-27 — Added `employer_assistant_recommendations` migration with action/rationale/evidence/risk and prompt audit fields, owner-scoped RLS policies, scope index, and updated-at trigger with migration contract coverage.

- [x] Task 5: Add screening kit migration owned by assistant recommendations (P0)
  - Acceptance: Migration creates `employer_assistant_screening_kits` and question records linked to assistant recommendations with rubric dimensions and uncertainty flags.
  - Files: `supabase/migrations/*_employer_assistant_screening_kits.sql`, `tests/supabase/employer-assistant-screening-kits-migration.test.ts`
  - Completed: 2026-04-27 — Added screening kits + screening questions migrations linked to assistant recommendations with rubric/uncertainty fields, owner-scoped RLS policies, indexes, and updated-at triggers with migration contract tests.

- [x] Task 6: Implement employer assistant persistence helpers (P0)
  - Acceptance: Helpers create/list/get assistant recommendations and screening kits using strict employer, job, and candidate profile scope.
  - Files: `src/lib/agents/employer-assistant/persistence.ts`, `tests/agents/employer-assistant/persistence.test.ts`
  - Completed: 2026-04-27 — Added employer assistant recommendation and screening kit/question persistence helpers with strict employer-job-candidate scoping, insert builders, and create/list/get coverage.

- [x] Task 7: Implement deterministic recruiting next-step advisor rules (P0)
  - Acceptance: Advisor maps candidate score, confidence, missing evidence, and job requirements to bounded next actions such as `screen_candidate`, `request_more_signal`, `review_candidate`, and `improve_job_requirements`.
  - Files: `src/lib/agents/employer-assistant/advisor.ts`, `tests/agents/employer-assistant/advisor.test.ts`
  - Completed: 2026-04-27 — Added deterministic next-step advisor with bounded action routing, rationale/evidence/risk generation, and stable-output test coverage across score-confidence-requirement scenarios.

- [x] Task 8: Implement assistant screening kit generator (P0)
  - Acceptance: Generator creates bounded technical/behavioral screening questions mapped to rubric dimensions and missing-signal flags.
  - Files: `src/lib/agents/employer-assistant/screening-kit.ts`, `tests/agents/employer-assistant/screening-kit.test.ts`
  - Completed: 2026-04-27 — Added deterministic screening kit generator with bounded question counts, signal-to-rubric mapping, uncertainty probes, and fallback technical/behavioral templates.

- [x] Task 9: Implement employer assistant orchestration request builder (P0)
  - Acceptance: Orchestrator builds an OpenAI Responses API request with strict JSON schema for recommendation, rationale, risk flags, and optional screening kit.
  - Files: `src/lib/agents/employer-assistant/orchestrator.ts`, `tests/agents/employer-assistant/orchestrator.test.ts`
  - Completed: 2026-04-27 — Added employer assistant orchestration request builder with strict JSON schema output contract, prompt assembly integration, and Responses API request envelope coverage.

- [x] Task 10: Implement assistant orchestration validation and bounded retry (P0)
  - Acceptance: Orchestrator validates model output, retries malformed output within bounded attempts, falls back to deterministic advisor when needed, and returns explicit failure reasons when exhausted.
  - Files: `src/lib/agents/employer-assistant/orchestrator.ts`, `tests/agents/employer-assistant/orchestrator.test.ts`
  - Completed: 2026-04-27 — Added orchestration runtime with bounded model retries, strict schema validation, deterministic advisor fallback with screening-kit attachment when applicable, and explicit retry-exhaustion failure reasons.

- [x] Task 11: Add employer server action to ask assistant for next recruiting step (P1)
  - Acceptance: Server action verifies employer owns the job and candidate profile, generates/persists assistant recommendation, and redirects back to candidate review.
  - Files: `src/app/employer/jobs/actions.ts`, `tests/employer/employer-assistant-action.test.ts`
  - Completed: 2026-04-27 — Added employer assistant next-step server action with strict owner/job/candidate scoping, orchestration + recommendation/screening persistence, and candidate-review redirect coverage.

- [x] Task 12: Add employer assistant panel to candidate profile review UI (P1)
  - Acceptance: Candidate profile page shows assistant next-step recommendation, rationale, evidence references, risk flags, and generated screening kit without exposing prompt bodies, provider ids, or hidden audit metadata.
  - Files: `src/app/employer/jobs/[id]/candidates/[candidateId]/page.tsx`, `src/app/globals.css`, `tests/employer/candidate-pages.test.ts`
  - Completed: 2026-04-27 — Added employer assistant panel on candidate profile review with ask-assistant action form, recommendation/risk/evidence/screening rendering, and redaction assertions for hidden prompt/provider metadata.

- [x] Task 13: Add authorization and privacy regressions for employer assistant output (P1)
  - Acceptance: Tests verify assistant records are owner/job/candidate scoped and UI output does not leak hidden prompt/tool metadata or unnecessary candidate PII.
  - Files: `tests/auth/enforce-route-access.test.ts`, `tests/agents/employer-assistant/*.test.ts`, `tests/employer/candidate-pages.test.ts`
  - Completed: 2026-04-27 — Added auth regression for assistant candidate routes, explicit assistant persistence scope regression, and UI privacy regressions preventing hidden assistant metadata/tool traces and candidate PII leakage.

- [x] Task 14: Add focused E2E and quality-gate tracking for v11 (P2)
  - Acceptance: Playwright covers employer asking the assistant for a next step or documents skip conditions; focused Vitest, build, Semgrep, and npm audit outcomes are recorded.
  - Files: `tests/e2e/v11-employer-assistant.spec.ts`, `tests/screenshots/`, `sprints/v11/TASKS.md`
  - Completed: 2026-04-27 — Added focused Playwright spec for assistant panel/ask-next-step and anonymous denial with explicit runtime skip guards; run outcomes recorded: `npx playwright test tests/e2e/v11-employer-assistant.spec.ts` (2 skipped due missing runtime env/credentials), `npx vitest run tests/agents/employer-assistant/*.test.ts tests/employer/employer-assistant-action.test.ts tests/employer/candidate-pages.test.ts` (pass), `npm run build` (pass), `npx semgrep --config auto src/ --quiet` (clean), `npm audit --audit-level=high` (0 vulnerabilities).

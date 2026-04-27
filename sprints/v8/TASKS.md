# Sprint v8 Tasks

- [x] Task 1: Set up sprint v8 artifacts and scope baseline (P0)
  - Acceptance: `sprints/v8/PRD.md` and `sprints/v8/TASKS.md` exist and match requested async streaming + fade UX scope.
  - Files: `sprints/v8/PRD.md`, `sprints/v8/TASKS.md`
  - Completed: 2026-04-26 — Baseline sprint artifacts created and aligned to async token streaming plus transient fade UX requirements.

- [x] Task 2: Add provider stream event model for async token handling (P0)
  - Acceptance: A typed event model exists for provider stream chunks (token/status/error/complete) and is reusable across route and tests.
  - Files: `src/lib/agents/job-posting/streaming.ts`, `tests/agents/job-posting/streaming.test.ts`
  - Completed: 2026-04-26 — Added typed provider stream event union and SSE frame encode/decode helpers with unit coverage.

- [x] Task 3: Implement true async/await OpenAI streaming inference path (P0)
  - Acceptance: Inference layer supports streaming responses via async iteration and returns normalized events without synthetic token generation.
  - Files: `src/lib/agents/job-posting/inference.ts`, `tests/agents/job-posting/inference.test.ts`
  - Completed: 2026-04-26 — Added async stream request + SSE async iterator yielding normalized token/status/result events from provider deltas.

- [x] Task 4: Refactor SSE route to forward provider tokens directly (P0)
  - Acceptance: `/api/employer/jobs/agent-stream` emits real token events from provider stream, handles provider errors cleanly, and preserves completion redirect behavior.
  - Files: `src/app/api/employer/jobs/agent-stream/route.ts`, `tests/e2e/v7-task8-stream-success-error.spec.ts`
  - Completed: 2026-04-26 — Route now forwards provider stream token/status events directly, emits clean error events, and redirects on completed persisted draft.

- [x] Task 5: Update employer composer state machine for streamed token lifecycle (P0)
  - Acceptance: Client consumes normalized SSE frames with async-safe state updates and stable status transitions (`idle`/`streaming`/`error`/`complete`).
  - Files: `src/components/employer-job-agent-composer.tsx`, `src/lib/agents/job-posting/composer-stream-state.ts`, `tests/employer/job-agent-composer-stream-state.test.ts`, `tests/e2e/v7-task7-thinking-stream.spec.ts`
  - Completed: 2026-04-26 — Replaced ad-hoc stream state with request-id-guarded reducer transitions, added explicit `complete` status, and added reducer + E2E coverage updates.

- [x] Task 6: Remove persistent right-side reasoning/thinking boxes from employer detail rail (P1)
  - Acceptance: Right rail no longer renders persistent reasoning/thinking message box sections; remaining review/publish controls still function.
  - Files: `src/app/employer/jobs/[id]/page.tsx`, `tests/employer/job-workflow.test.ts`
  - Completed: 2026-04-26 — Removed Agent Transparency reasoning/thinking rail card from job detail page and added regression test coverage that page source no longer includes persistent reasoning/thinking sections.

- [x] Task 7: Add transient reasoning/thinking message presenter with fade in/out (P1)
  - Acceptance: Streaming reasoning/thinking messages render as transient rows with deterministic enter/exit animation timing; messages clear after fade-out.
  - Files: `src/components/employer-job-agent-composer.tsx`, `src/app/globals.css`
  - Completed: 2026-04-26 — Added transient thinking-message queue with deterministic enter/exit timing, fade animation classes/keyframes, and E2E assertions for visible-then-cleared lifecycle.

- [x] Task 8: Apply layout/style cleanup for no-box right-side experience (P1)
  - Acceptance: Employer job creation and detail layouts no longer depend on right-rail transparency cards; spacing remains stable on desktop/mobile.
  - Files: `src/app/employer/jobs/new/page.tsx`, `src/app/employer/jobs/[id]/page.tsx`, `src/app/globals.css`
  - Completed: 2026-04-26 — Replaced boxed right-side sections with unframed side sections on new/detail pages and added CSS divider-based side layout styles with regression coverage.

- [x] Task 9: Add unit coverage for animation state lifecycle logic (P2)
  - Acceptance: Tests verify message queue timing (fade-in, visible, fade-out, remove) and no stuck transient states during rapid token streams.
  - Files: `tests/agents/job-posting/streaming.test.ts`, `tests/employer/job-agent-action.test.ts`
  - Completed: 2026-04-26 — Added deterministic lifecycle scheduling tests (fade-in/visible/fade-out/remove), cancellation coverage, and rapid stream restart regression to prevent stuck transient messages.

- [x] Task 10: Add E2E assertions for fade UX and no right-rail reasoning boxes (P2)
  - Acceptance: Playwright confirms streaming output appears, transient messages animate/clear, and right-side reasoning/thinking boxes are absent.
  - Files: `tests/e2e/v7-task7-thinking-stream.spec.ts`, `tests/e2e/v7-task8-stream-success-error.spec.ts`, `tests/screenshots/`
  - Completed: 2026-04-26 — Added E2E assertions for transient fade class lifecycle, message clear behavior, and absence of Agent Transparency/Reasoning/Thinking right-rail boxes across stream success and error flows.

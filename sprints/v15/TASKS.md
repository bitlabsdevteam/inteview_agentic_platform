# Sprint v15 Tasks

- [x] Task 1: Add v15 workspace fixtures for read-only artifact and chat-only rail (P0)
  - Acceptance: Shared fixtures cover the single-workspace layout, read-only artifact sections, and keyboard-submit chat expectations.
  - Files: `tests/components/employer-job-detail-readonly.test.ts`, `tests/components/employer-job-agent-chat.test.ts`
  - Completed: 2026-04-27 - Added reusable v15 workspace fixtures for the two-panel read-only artifact layout, artifact section inventory, shared chat props, and keyboard-submit expectations; verified with targeted Vitest, Semgrep clean, npm audit clean, and graph rebuild.

- [x] Task 2: Add failing tests for the read-only employer job workspace shell (P0)
  - Acceptance: Tests require the job detail page to render one read-only artifact surface, no stage bar, and no stage query navigation.
  - Files: `tests/components/employer-job-detail-readonly.test.ts`
  - Completed: 2026-04-27 - Added red-first route coverage requiring a single read-only workspace surface, no stage pipeline, no stage query navigation, and no editable artifact controls; verified expected failing Vitest state plus Semgrep clean and npm audit clean.

- [x] Task 3: Implement a read-only workspace presenter for employer job detail data (P0)
  - Acceptance: A deterministic view-model helper assembles the full artifact sections needed by the read-only workspace from persisted job, role-profile, quality, and interview data.
  - Files: `src/lib/employer/job-readonly-workspace.ts`, `src/app/employer/jobs/[id]/page.tsx`
  - Completed: 2026-04-27 - Implemented a deterministic read-only workspace presenter for role profile, generated job posting, interview structure, and review notes, then rewired the employer job detail route to render a single artifact workspace instead of stage panels or editable forms; verified with targeted Vitest route/presenter coverage, workflow regression tests, Semgrep clean, and npm audit clean.

- [x] Task 4: Add failing tests for chat-only right rail behavior (P0)
  - Acceptance: Tests require the right panel to contain only chat thread/composer content, hide memory and side-summary widgets, remove `Send To Agent`, and submit on `Enter` while preserving `Shift+Enter` newline behavior.
  - Files: `tests/components/employer-job-agent-chat.test.ts`
  - Completed: 2026-04-27 - Added red-first chat coverage that forbids side widgets and visible send-button UI in the right rail, and requires explicit `Enter` submit plus `Shift+Enter` newline handling in the chat composer source; verified expected failing Vitest state plus Semgrep clean and npm audit clean.

- [ ] Task 5: Implement minimal chat rail and keyboard-submit composer (P0)
  - Acceptance: The chat component removes non-chat side panels, removes the visible send button, and sends a message on `Enter` without submitting on `Shift+Enter`.
  - Files: `src/components/employer-job-agent-chat.tsx`, `src/app/globals.css`

- [ ] Task 6: Add failing tests for route/page contracts after stage removal (P0)
  - Acceptance: Tests require the employer job route and chat flow to stop depending on `activeStage`, `stageSummary`, and stage-based panel rendering for the workspace UI.
  - Files: `tests/components/employer-job-detail-readonly.test.ts`, `tests/app/api/employer/jobs/agent-chat-route.test.ts`

- [ ] Task 7: Implement single-workspace page layout and retire stage-based UI wiring (P0)
  - Acceptance: The employer job detail page renders the read-only artifact left panel and chat-only right panel, with stage bar and interview blueprint form removed from the page.
  - Files: `src/app/employer/jobs/[id]/page.tsx`, `src/components/employer-interview-blueprint-panel.tsx`, `src/app/globals.css`

- [ ] Task 8: Update chat route and refresh flow for artifact-first rendering (P1)
  - Acceptance: After each successful chat turn, the route still returns authorized revision results and the page refresh path updates the left-side read-only artifact without relying on stage metadata.
  - Files: `src/app/api/employer/jobs/[id]/agent-chat/route.ts`, `tests/app/api/employer/jobs/agent-chat-route.test.ts`

- [ ] Task 9: Add focused E2E coverage for read-only artifact review plus Enter-to-send chat revision (P1)
  - Acceptance: Playwright verifies the employer sees a read-only artifact, the right rail is chat only, `Enter` sends a revision request, and the artifact updates afterward.
  - Files: `tests/e2e/v15-readonly-job-workspace.spec.ts`

- [ ] Task 10: Run targeted validation suite and refresh graph artifacts (P0)
  - Acceptance: Relevant Vitest, Playwright, build, and graph rebuild commands complete, or blockers are documented in task notes.
  - Commands: `npx vitest run tests/components/employer-job-detail-readonly.test.ts tests/components/employer-job-agent-chat.test.ts tests/app/api/employer/jobs/agent-chat-route.test.ts`, `npx playwright test tests/e2e/v15-readonly-job-workspace.spec.ts`, `npm run build`, `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`

# Sprint v4 Tasks

- [x] Task 1: Review current top-menu and role-guard behavior (P0)
  - Acceptance: The sprint records the current header links for anonymous, employer, and job seeker sessions, plus the current direct-route behavior for `/employer` and `/job-seeker`.
  - Files: `src/components/account-header.tsx`, `src/components/route-shell.tsx`, `src/lib/auth/route-guard.ts`, `src/lib/auth/enforce-route-access.ts`, `tests/auth/account-header.test.ts`, `tests/auth/route-guard.test.ts`
  - Current Baseline:
    - Anonymous header links are `Home`, `Login`, `Register`, `Employer`, and `Job Seeker`.
    - Authenticated employer header links are currently `Home`, `Employer`, and `Job Seeker`, which is the v4 gap to close.
    - Authenticated job seeker header links are currently `Home`, `Employer`, and `Job Seeker`, which should become job-seeker scoped in v4.
    - Anonymous direct access to `/employer`, `/job-seeker`, or `/auth/complete-role` redirects to `/login`.
    - Authenticated no-role users on auth or protected routes redirect to `/auth/complete-role?intent=login`.
    - Authenticated role mismatches already redirect to the saved role destination through `resolveRouteGuardRedirect`, including employer access to `/job-seeker` -> `/employer` and job seeker access to `/employer` -> `/job-seeker`.
  - Completed: 2026-04-25 — Reviewed current header and guard contracts, verified the baseline with `npx vitest run tests/auth/account-header.test.ts tests/auth/route-guard.test.ts` (15 tests passed), ran `npx semgrep --config auto src/ --quiet`, and cleared `npm audit` by pinning patched PostCSS through npm overrides.

- [x] Task 2: Add failing unit coverage for employer-scoped top-menu links (P0)
  - Acceptance: A test proves an authenticated employer sees `Home` and `Employer`, does not see `Job Seeker`, and still receives the logout-only account action.
  - Files: `tests/auth/account-header.test.ts`, `src/components/account-header.tsx`
  - Completed: 2026-04-25 — Added the employer-scoped navigation regression in `tests/auth/account-header.test.ts`. The focused test target is intentionally red until Task 4 implements role-scoped links: `npx vitest run tests/auth/account-header.test.ts` fails because the current employer nav still returns `Home`, `Employer`, and `Job Seeker`. Security checks passed with `npx semgrep --config auto src/ --quiet` and `npm audit`.

- [x] Task 3: Add failing unit coverage for employer denial from job-seeker routes (P0)
  - Acceptance: A test proves an authenticated employer requesting `/job-seeker` resolves to `/employer` before the job-seeker page can render.
  - Files: `tests/auth/route-guard.test.ts`, `tests/auth/enforce-route-access.test.ts`, `src/lib/auth/route-guard.ts`, `src/lib/auth/enforce-route-access.ts`
  - Completed: 2026-04-25 — Added explicit regression coverage for employer access to `/job-seeker` at the route resolver and server enforcement layers. The focused target passed immediately because the existing mismatch redirect implementation already routes employers back to `/employer`: `npx vitest run tests/auth/route-guard.test.ts tests/auth/enforce-route-access.test.ts` (15 tests passed). Security checks passed with `npx semgrep --config auto src/ --quiet` and `npm audit`.

- [x] Task 4: Implement role-scoped authenticated navigation links (P0)
  - Acceptance: `getAccountHeaderNavLinks` returns public links for anonymous users, employer-only links for employer users, and job-seeker-only links for job seeker users.
  - Files: `src/components/account-header.tsx`, `tests/auth/account-header.test.ts`
  - Completed: 2026-04-25 — Implemented role-derived authenticated navigation so employer sessions receive `Home` and `Employer`, job seeker sessions receive `Home` and `Job Seeker`, anonymous users keep public auth and workspace links, and authenticated no-role users receive `Home` only while route guards send them to role completion. Added job-seeker scoped nav coverage and verified the pre-existing employer regression now passes. Validation: `npx vitest run tests/auth/account-header.test.ts` (9 tests passed), `npx semgrep --config auto src/ --quiet`, and `npm audit`.

- [x] Task 5: Implement protected-route mismatch redirects (P0)
  - Acceptance: Employer sessions are redirected from `/job-seeker` to `/employer`, job seeker sessions are redirected from `/employer` to `/job-seeker`, anonymous users still redirect to `/login`, and no-role users still redirect to `/auth/complete-role`.
  - Files: `src/lib/auth/route-guard.ts`, `src/lib/auth/enforce-route-access.ts`, `tests/auth/route-guard.test.ts`, `tests/auth/enforce-route-access.test.ts`
  - Completed: 2026-04-25 — Added explicit resolver and server enforcement coverage for job seeker sessions denied from `/employer` and authenticated no-role sessions redirected from protected routes to role completion. The existing generic protected-route mismatch implementation already satisfied the full redirect matrix, so no production changes were needed. Validation: `npx vitest run tests/auth/route-guard.test.ts tests/auth/enforce-route-access.test.ts` (19 tests passed), `npx semgrep --config auto src/ --quiet`, and `npm audit`.

- [x] Task 6: Redesign the account header as a professional top menu bar (P1)
  - Acceptance: The header includes a clear brand area, role-scoped primary navigation, accessible focus states, and a compact profile/logout area without public auth actions after login.
  - Files: `src/components/account-header.tsx`, `src/components/account-profile-controls.tsx`, `src/app/globals.css`, `tests/auth/account-header.test.ts`
  - Completed: 2026-04-25 — Reworked `AccountHeader` into a branded top menu with an Interview Agent home link, role-scoped primary workspace navigation, compact account/logout placement, and focused CSS states. Added render-level coverage proving authenticated employer sessions expose the branded top menu, retain logout/profile controls, and omit public auth plus job-seeker links. Validation: `npx vitest run tests/auth/account-header.test.ts` (10 tests passed), `npx semgrep --config auto src/ --quiet`, and `npm audit`.

- [ ] Task 7: Apply the refined AI agentic company visual language to shared shells (P1)
  - Acceptance: Public, employer, and job seeker shells share consistent spacing, typography, color tokens, and surface styling without nested card-heavy layouts or visible debug/session text.
  - Files: `src/components/route-shell.tsx`, `src/components/employer-chat-shell.tsx`, `src/components/job-seeker-shell.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] Task 8: Add responsive top-menu behavior (P1)
  - Acceptance: The top menu remains usable at mobile and desktop widths, labels do not overlap profile controls, and account actions remain reachable.
  - Files: `src/components/account-header.tsx`, `src/components/account-profile-controls.tsx`, `src/app/globals.css`, `tests/e2e/v4-top-menu-responsive.spec.ts`

- [ ] Task 9: Add Playwright coverage for employer login menu isolation (P1)
  - Acceptance: An employer-authenticated browser flow verifies the top menu does not show `Job Seeker`, shows the employer profile state, and retains logout.
  - Files: `tests/e2e/v4-employer-menu-isolation.spec.ts`, `tests/screenshots/`

- [ ] Task 10: Add Playwright coverage for employer direct-route denial (P1)
  - Acceptance: An employer-authenticated browser flow navigates directly to `/job-seeker` and verifies the app redirects to `/employer` without rendering job-seeker-only content.
  - Files: `tests/e2e/v4-employer-route-denial.spec.ts`, `tests/screenshots/`

- [ ] Task 11: Run focused validation and update completion notes (P2)
  - Acceptance: The smallest relevant Vitest and Playwright targets run, results are recorded, and this task list is updated with completion notes.
  - Files: `sprints/v4/TASKS.md`, relevant test output or screenshots under `tests/screenshots/`

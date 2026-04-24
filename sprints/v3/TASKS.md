- [x] Task 1: Review the current auth surface and create the v3 implementation checklist (P0)
  - Acceptance: The sprint identifies every public auth entry point, protected route, and shared navigation area that must become session-aware before code changes begin.
  - Files: `sprints/v3/PRD.md`, `sprints/v3/TASKS.md`, relevant auth/navigation files under `src/app/` and `src/components/`
  - Completed: 2026-04-24 - Added a concrete auth surface checklist to the v3 PRD covering landing, login, registration, role-completion, protected routes, shared shells, and the route-guard files that govern session-aware redirects.

- [x] Task 2: Add a shared server-side authenticated header/profile component contract (P0)
  - Acceptance: A reusable header or shell component can read the active session, derive the current user identity and role, and expose props or rendering branches for authenticated vs unauthenticated states.
  - Files: `src/components/account-header.tsx`, `src/components/route-shell.tsx`, `tests/auth/account-header.test.ts`
  - Completed: 2026-04-24 - Added a shared server-side account header contract that reads the current Supabase session, derives authenticated identity and role state, and exposes anonymous versus authenticated navigation branches for reuse in shared shells.

- [x] Task 3: Hide public login and register actions once a session exists (P0)
  - Acceptance: Authenticated users no longer see public `Login` or `Register` actions in shared navigation, landing surfaces, or protected shells where a profile affordance is available.
  - Files: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/login/login-screen.tsx`, `src/app/register/page.tsx`, `src/app/register/registration-screen.tsx`, `src/app/auth/complete-role/page.tsx`, `src/app/auth/complete-role/complete-role-screen.tsx`, `src/components/employer-chat-shell.tsx`, `src/components/job-seeker-shell.tsx`, `src/components/home-page-actions.ts`, `tests/auth/home-page-actions.test.ts`
  - Completed: 2026-04-24 - Replaced hardcoded public auth nav links with the shared account header across landing, auth, and protected shells, and added an authenticated landing-page CTA branch so signed-in users no longer see `Login` or `Register` actions.

- [ ] Task 4: Show a user profile area with a logout action as the authenticated account control (P0)
  - Acceptance: When a user is signed in, the UI shows a profile section and the only account action presented there is `Logout`.
  - Files: `src/components/route-shell.tsx`, new profile menu component files under `src/components/`, `src/app/globals.css`, relevant tests

- [ ] Task 5: Implement a secure logout action that signs out from Supabase and redirects to the public app (P0)
  - Acceptance: Triggering logout clears the current session, returns the user to `/`, and causes protected routes to redirect back through the public auth flow.
  - Files: new logout action/route files under `src/app/` or `src/lib/auth/`, `src/lib/supabase/server.ts`, `src/lib/auth/enforce-route-access.ts`, relevant tests

- [ ] Task 6: Lock the registration contract so role choice is mandatory and successful employer signup resolves to `/employer` (P0)
  - Acceptance: Email/password and Google registration both require an explicit role, and a completed employer signup with an active session redirects to `/employer`.
  - Files: `src/app/register/actions.ts`, `src/lib/auth/register-user.ts`, `src/app/auth/callback/route.ts`, `tests/auth/register-user.test.ts`, relevant E2E tests

- [ ] Task 7: Lock the registration contract so successful job seeker signup resolves to `/job-seeker` (P0)
  - Acceptance: Email/password and Google registration both redirect a completed job seeker signup with an active session to `/job-seeker`, while confirmation-required environments still show the correct pending-confirmation state.
  - Files: `src/app/register/actions.ts`, `src/lib/auth/register-user.ts`, `src/app/auth/callback/route.ts`, `tests/auth/register-user.test.ts`, relevant E2E tests

- [ ] Task 8: Preserve role-based login redirects and authenticated auth-page bypass behavior (P1)
  - Acceptance: Returning users who log in are routed to the workspace tied to their saved role, and authenticated users who revisit `/login` or `/register` are redirected back into the app.
  - Files: `src/lib/auth/login-user.ts`, `src/lib/auth/route-guard.ts`, `src/lib/auth/enforce-route-access.ts`, `tests/auth/login-user.test.ts`, `tests/auth/route-guard.test.ts`

- [ ] Task 9: Add unit coverage for authenticated header state and logout behavior (P1)
  - Acceptance: Automated tests verify the navigation state for signed-in users, the absence of public auth actions after login, and the redirect/session contract after logout.
  - Files: `tests/auth/*.test.ts`, possible new component or route tests under `tests/`

- [ ] Task 10: Add Playwright coverage for employer registration to employer page and logout recovery (P1)
  - Acceptance: An end-to-end test proves employer signup reaches `/employer`, the authenticated UI shows profile/logout state, logout succeeds, and protected employer pages become inaccessible without a session.
  - Files: `tests/e2e/task10-auth-matrix.spec.ts`, new or updated auth E2E specs, `tests/screenshots/`

- [ ] Task 11: Add Playwright coverage for job seeker registration/login/logout continuity (P1)
  - Acceptance: An end-to-end test proves job seeker signup reaches `/job-seeker`, login restores that destination, and logout returns the session to a public state.
  - Files: `tests/e2e/task10-auth-matrix.spec.ts`, new or updated auth E2E specs, `tests/screenshots/`

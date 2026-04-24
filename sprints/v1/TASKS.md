- [x] Task 1: Set up sprint v1 app and auth configuration scaffolding (P0)
  - Acceptance: App has environment wiring for Supabase auth, agreed public/authenticated routes, and a shared auth client utility.
  - Files: `src/` app shell, auth utilities, `.env.example`, route scaffolding
  - Completed: 2026-04-22 - Bootstrapped a Next.js app shell with public and protected route stubs, shared Supabase browser/server utilities, middleware session wiring, and config tests for env and route contracts.

- [x] Task 2: Build the main landing page with employer and job seeker entry points (P0)
  - Acceptance: `/` clearly explains the platform, shows login/register actions, and lets users identify the two primary paths.
  - Files: landing page component, shared marketing sections, styles/assets
  - Completed: 2026-04-23 - Replaced the placeholder home route with a branded landing page, explicit auth CTAs, role-specific entry cards, and Playwright coverage with screenshots.

- [x] Task 3: Create the registration screen with mandatory role selection (P0)
  - Acceptance: `/register` requires choosing `Employer` or `Job Seeker` before account creation can continue.
  - Files: registration page, role selector component, form validation logic
  - Completed: 2026-04-23 - Added a role-gated registration form shell, reusable role selector, query-param role prefilling, and Playwright coverage with screenshots.

- [x] Task 4: Implement email/password signup with Supabase and role persistence (P0)
  - Acceptance: New users can sign up, their selected role is saved, and auth errors are surfaced clearly.
  - Files: Supabase auth actions, profile/metadata persistence logic, registration handlers
  - Completed: 2026-04-23 - Added a server-backed email signup action, persisted selected roles in Supabase auth metadata, surfaced validation/auth feedback in the registration UI, and covered the flow with unit plus Playwright tests.

- [x] Task 5: Implement Google OAuth signup and login for both roles (P0)
  - Acceptance: Users can authenticate with Google, complete role assignment when needed, and return to the app successfully.
  - Files: OAuth handlers, callback handling, role completion flow
  - Completed: 2026-04-23 - Added Google OAuth start actions for register/login, a callback route that persists or reads role metadata, a role-completion recovery screen, and unit plus Playwright coverage for both direct and missing-role paths.

- [x] Task 6: Build the login screen for returning users (P0)
  - Acceptance: `/login` supports email/password and Google sign-in, with clear recovery and error states.
  - Files: login page, auth form components, shared auth messaging
  - Completed: 2026-04-23 - Added email/password login with role-based post-auth redirects, surfaced invalid-credential and recovery states on the login screen, and extended auth coverage with unit plus Playwright tests.

- [x] Task 7: Add session-aware route guards and role-based redirects (P0)
  - Acceptance: Authenticated users bypass public auth pages and are redirected to the correct destination based on saved role.
  - Files: `middleware.ts`, `src/lib/supabase/middleware.ts`, `src/lib/auth/route-guard.ts`, `src/lib/auth/mock-session.ts`, auth actions/pages
  - Completed: 2026-04-24 - Added role-aware middleware redirects for auth and protected routes, persisted mock auth session state for guarded test/dev flows, and validated the changes with unit tests, production build, semgrep, and npm audit.

- [x] Task 8: Create the employer chat agent UI shell as the first protected destination (P0)
  - Acceptance: Employers land on `/employer` after auth and see an initial chat-agent interface ready for future job-description workflows.
  - Files: `src/app/employer/page.tsx`, `src/components/employer-chat-shell.tsx`, `src/app/globals.css`, `tests/e2e/task8-employer-chat-shell.spec.ts`
  - Completed: 2026-04-24 - Replaced the employer placeholder with a dedicated chat-agent workspace shell, added targeted Playwright coverage for the protected employer flow, and validated the implementation with unit tests, production build, semgrep, and npm audit. Playwright execution was blocked in this sandbox by local port bind restrictions.

- [x] Task 9: Create the initial job seeker protected landing page (P1)
  - Acceptance: Job seekers land on `/job-seeker` after auth and see a basic authenticated placeholder confirming the correct role flow.
  - Files: `src/app/job-seeker/page.tsx`, `src/components/job-seeker-shell.tsx`, `src/app/globals.css`, `tests/e2e/task9-job-seeker-landing.spec.ts`
  - Completed: 2026-04-24 - Replaced the generic job seeker placeholder with a protected candidate landing shell, added targeted Playwright coverage for the role-based destination, and validated the implementation with unit tests, production build, semgrep, and npm audit. Playwright execution was blocked in this sandbox by local port and server reuse issues.

- [x] Task 10: Add end-to-end auth coverage for both roles and both sign-in methods (P1)
  - Acceptance: Tests cover landing page entry, employer registration/login, job seeker registration/login, role-based redirects, and protected-page access.
  - Files: `tests/e2e/task10-auth-matrix.spec.ts`, `playwright.config.ts`, `playwright.manual.config.ts`, auth route guards/pages, `tests/screenshots/task10-*.png`
  - Completed: 2026-04-24 - Added a consolidated auth E2E matrix for both roles and both sign-in methods, hardened mock auth redirects and page-level route enforcement, and validated the full Playwright suite plus unit tests, production build, semgrep, and npm audit.

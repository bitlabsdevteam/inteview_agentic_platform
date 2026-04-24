- [x] Task 1: Complete Supabase email auth registration flow with role-aware redirect behavior (P0)
  - Acceptance: Email signup supports validation and auth errors, redirects into the correct workspace when Supabase returns a session, and preserves the email-confirmation path when a session is not returned.
  - Files: `src/lib/auth/register-user.ts`, `src/app/register/actions.ts`, `tests/auth/register-user.test.ts`, `tests/e2e/task4-register-email-signup.spec.ts`, `tests/e2e/task10-auth-matrix.spec.ts`
  - Completed: 2026-04-24 - Added immediate-session signup redirect support, kept confirmation-required messaging for verification-first environments, aligned mock auth with the new contract, and validated with Vitest, Next.js production build, semgrep, and npm audit.

- [x] Task 2: Remove the mock auth bypass and ship real Supabase-only auth wiring (P0)
  - Acceptance: Login, registration, role completion, callback handling, and route guards no longer use mock cookies or mock query params; Playwright auth specs rely on real env-provided credentials instead of synthetic auth state.
  - Files: `src/app/login/actions.ts`, `src/app/register/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/complete-role/actions.ts`, `src/lib/auth/enforce-route-access.ts`, `src/lib/supabase/middleware.ts`, `src/app/login/login-screen.tsx`, `playwright.config.ts`, `.env.example`, `tests/e2e/*.spec.ts`
  - Completed: 2026-04-24 - Removed the mock auth session module and all mock-only branches, left a single real Supabase auth path in the app, and converted Playwright auth success flows to require explicit real test credentials and Google OAuth opt-in.

- [x] Task 3: Route visible login and registration entry points directly into Google OAuth (P1)
  - Acceptance: The home-page CTAs and shared navigation login/register links start Google auth immediately instead of linking to guarded auth pages that bounce authenticated users back to their workspace.
  - Files: `src/app/auth/google/route.ts`, `src/lib/auth/google-oauth.ts`, `src/app/page.tsx`, `src/components/*.tsx`, `src/app/*/*screen.tsx`, `tests/auth/google-oauth.test.ts`, `tests/e2e/task2-landing-page.spec.ts`
  - Completed: 2026-04-24 - Added a dedicated Google auth start route, updated public and protected nav entry points to use it, and validated the behavior with unit tests plus a production build.

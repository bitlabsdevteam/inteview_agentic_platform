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

- [ ] Task 4: Implement email/password signup with Supabase and role persistence (P0)
  - Acceptance: New users can sign up, their selected role is saved, and auth errors are surfaced clearly.
  - Files: Supabase auth actions, profile/metadata persistence logic, registration handlers

- [ ] Task 5: Implement Google OAuth signup and login for both roles (P0)
  - Acceptance: Users can authenticate with Google, complete role assignment when needed, and return to the app successfully.
  - Files: OAuth handlers, callback handling, role completion flow

- [ ] Task 6: Build the login screen for returning users (P0)
  - Acceptance: `/login` supports email/password and Google sign-in, with clear recovery and error states.
  - Files: login page, auth form components, shared auth messaging

- [ ] Task 7: Add session-aware route guards and role-based redirects (P0)
  - Acceptance: Authenticated users bypass public auth pages and are redirected to the correct destination based on saved role.
  - Files: middleware/guard logic, session bootstrap utilities, redirect helpers

- [ ] Task 8: Create the employer chat agent UI shell as the first protected destination (P0)
  - Acceptance: Employers land on `/employer` after auth and see an initial chat-agent interface ready for future job-description workflows.
  - Files: employer dashboard/page, chat shell components, protected layout

- [ ] Task 9: Create the initial job seeker protected landing page (P1)
  - Acceptance: Job seekers land on `/job-seeker` after auth and see a basic authenticated placeholder confirming the correct role flow.
  - Files: job seeker dashboard/page, protected layout content

- [ ] Task 10: Add end-to-end auth coverage for both roles and both sign-in methods (P1)
  - Acceptance: Tests cover landing page entry, employer registration/login, job seeker registration/login, role-based redirects, and protected-page access.
  - Files: `tests/e2e/`, screenshots, auth test fixtures/config

# Sprint v5 Tasks

- [x] Task 1: Define employer job lifecycle contracts (P0)
  - Acceptance: Tests cover draft insert shape, required review step, and status-aware list actions.
  - Files: `tests/employer/job-workflow.test.ts`, `src/lib/employer/jobs.ts`

- [x] Task 2: Add employer Jobs navigation (P0)
  - Acceptance: Authenticated employers see `Home`, `Employer`, and `Jobs`; job seekers do not see employer job links.
  - Files: `src/components/account-header.tsx`, `tests/auth/account-header.test.ts`

- [x] Task 3: Add employer job persistence helpers (P0)
  - Acceptance: Shared helpers create drafts, list owner-scoped jobs, load one job, update drafts, and enforce valid status transitions.
  - Files: `src/lib/employer/jobs.ts`

- [x] Task 4: Add Supabase employer jobs migration (P0)
  - Acceptance: SQL defines `employer_jobs`, status checks, owner index, updated timestamp trigger, and RLS policies.
  - Files: `supabase/migrations/20260425000000_employer_jobs.sql`

- [x] Task 5: Add create-job server action and page (P0)
  - Acceptance: Employers can submit structured job fields and land on the created draft detail route.
  - Files: `src/app/employer/jobs/actions.ts`, `src/app/employer/jobs/new/page.tsx`

- [x] Task 6: Add employer jobs list route (P0)
  - Acceptance: Employers can view their jobs with title, status, department, update date, and primary action.
  - Files: `src/app/employer/jobs/page.tsx`

- [x] Task 7: Add job detail review and publish route (P0)
  - Acceptance: Employers can save draft edits, mark ready for review, and publish from `needs_review`.
  - Files: `src/app/employer/jobs/[id]/page.tsx`, `src/app/employer/jobs/actions.ts`

- [x] Task 8: Connect employer workspace CTAs to jobs (P1)
  - Acceptance: The employer workspace links to create job and view jobs without starting interviews.
  - Files: `src/components/employer-chat-shell.tsx`

- [x] Task 9: Style v5 employer job surfaces (P1)
  - Acceptance: Jobs list, create form, and detail review surfaces fit the existing employer visual system and remain responsive.
  - Files: `src/app/globals.css`

- [x] Task 10: Run focused validation and record results (P1)
  - Acceptance: Relevant Vitest targets, Next build, Semgrep, and npm audit are run; results are recorded here.
  - Files: `sprints/v5/TASKS.md`
  - Completed: 2026-04-25 — Validation passed with `npx vitest run tests/employer/job-workflow.test.ts tests/auth/account-header.test.ts tests/auth/route-guard.test.ts tests/auth/enforce-route-access.test.ts tests/shells/visual-language.test.ts` (36 tests passed), `npm run build`, `npx semgrep --config auto src/ --quiet`, and `npm audit` (0 vulnerabilities).

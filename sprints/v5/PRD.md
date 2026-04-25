# Sprint v5 PRD

## Sprint Overview
Sprint v5 turns the employer workspace into the first real hiring workflow: a Job Creation Agent that creates structured job drafts, routes them through review, and publishes only after explicit employer approval. The sprint adds employer-owned job persistence, a jobs list, draft detail pages, and Supabase row-level security boundaries.

## Goals
- Add an employer-only jobs list with status-aware primary actions.
- Add a create-job flow that captures structured role context before generating a draft.
- Persist employer job drafts in Supabase/Postgres with owner-scoped RLS.
- Require `draft -> needs_review -> published` before a job is considered published.
- Keep interview launch, applicant intake, and job seeker job discovery out of v5.

## User Stories
- As an employer, I want to create a new job draft from the employer workspace so I can turn a hiring brief into a role artifact.
- As an employer, I want to view all my jobs with clear statuses so I know what needs drafting, review, or follow-up.
- As an employer, I want to review a generated job draft before publishing so no role becomes candidate-facing accidentally.
- As the platform, I want job records scoped to the authenticated employer so one employer cannot read or mutate another employer's jobs.

## Technical Architecture
- Frontend: Next.js App Router routes under `/employer/jobs`.
- Auth: Existing Supabase session and role guard for employer-only access.
- Data: `public.employer_jobs` table with RLS by `auth.uid() = employer_user_id`.
- Domain logic: shared job lifecycle helpers for draft insert shape, status transitions, and list actions.
- Testing: Vitest for lifecycle contracts and account navigation; browser coverage remains focused on protected employer routes.

```text
Employer Session
  |
  v
/employer
  |
  +--> Create Job CTA
  |
  v
/employer/jobs/new
  |
  +--> create draft in employer_jobs
  |
  v
/employer/jobs/[id]
  |
  +--> save draft
  +--> mark ready for review
  +--> publish job
  |
  v
/employer/jobs
  |
  +--> draft / needs_review / published / closed list
```

### Data Flow
1. Employer opens `/employer/jobs/new` from the workspace or jobs list.
2. The form captures title, department, level, location, compensation, hiring problem, outcomes, requirements, and interview loop.
3. The server action validates required fields and inserts a `draft` row owned by the authenticated employer.
4. The detail page loads only rows matching the current employer user id.
5. The employer saves edits, submits for review, and publishes through explicit server actions.
6. Published jobs record `published_at`; candidate applications and interviews remain future sprint work.

## Out Of Scope
- Job seeker job board and search.
- Candidate applications and applicant list.
- Starting, scheduling, or executing interviews.
- AI model calls for live prompt generation.
- Admin moderation or multi-employer organization management.

## Dependencies
- Sprint v4 authenticated employer shell and route guards.
- Supabase Auth user ids available server-side.
- Supabase migration `20260425000000_employer_jobs.sql` applied before using real persistence.

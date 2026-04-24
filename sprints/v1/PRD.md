# Sprint v1 PRD

## Sprint Overview
Sprint v1 establishes the first usable surface of the interview agentic platform. It delivers a public landing page, registration and login for both employers and job seekers, role-aware onboarding with Supabase and Google Auth, and an employer-first authenticated destination that opens into an employer chat agent UI.

This sprint is intentionally narrow: it proves account creation, role selection, and protected routing end to end before deeper employer and job seeker workflows are added in later sprints.

## Goals
- Launch a main landing page that explains the platform and prompts users to sign in or register.
- Require users to choose either `Employer` or `Job Seeker` during account creation.
- Support Supabase email/password auth and Google OAuth for both signup and login.
- Persist the chosen role and use it to drive post-auth routing.
- Route authenticated employers into an employer chat agent UI shell.

## User Stories
- As an employer, I want to register and identify myself as an employer so that I can access tools to create and refine job descriptions.
- As a job seeker, I want to register with email/password or Google so that I can enter the platform quickly and begin interview preparation later.
- As a returning user, I want to log in with the same method I used before so that I can continue my workflow without friction.
- As the platform, I want to persist a user role at signup so that the app can enforce role-specific experiences after authentication.

## Technical Architecture
- Frontend: Next.js application for landing page, auth screens, protected routes, and initial employer UI shell.
- Auth: Supabase Auth for email/password and Google OAuth.
- Data: Supabase user profile or metadata record storing role selection (`employer` or `job_seeker`).
- Session handling: Supabase session check on app load plus route guards for authenticated pages.

```text
Visitor
  |
  v
Landing Page (/)
  |
  +--> Register Flow (/register)
  |      |
  |      +--> Choose role
  |      +--> Email/password or Google OAuth
  |      +--> Save role in Supabase profile/metadata
  |      +--> Redirect by role
  |
  +--> Login Flow (/login)
         |
         +--> Email/password or Google OAuth
         +--> Read saved role
         +--> Redirect by role

Authenticated Employer --> /employer --> Employer Agent Chat UI shell
Authenticated Job Seeker --> /job-seeker --> initial protected landing shell
```

### Data Flow
1. User opens landing page and selects login or registration.
2. Registration flow requires role selection before auth submission.
3. Supabase creates or authenticates the user.
4. App stores or reads the role from profile data or user metadata.
5. Route guard redirects employer users to the employer chat agent UI and job seekers to their protected entry page.

## Out of Scope
- Full employer job-description generation workflow.
- Job publishing and application management.
- Full job seeker interview-preparation experience.
- Virtual interview session orchestration.
- Admin tools, analytics, billing, or notification systems.

## Dependencies
- Supabase project configured with email/password auth enabled.
- Supabase Google OAuth provider configured with valid redirect URLs.
- Frontend environment variables for Supabase URL, anon key, and app URL.
- Agreed route structure for public and authenticated pages.

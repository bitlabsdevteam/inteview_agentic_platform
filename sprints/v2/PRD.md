# Sprint v2 PRD

## Sprint Overview
Sprint v2 hardens the authentication experience so registration and login behave as complete product flows rather than partial auth stubs. The focus is Supabase email/password auth and Google OAuth for both employers and job seekers, with successful registration leading into the correct protected workspace whenever Supabase returns an active session.

## Goals
- Preserve email/password registration for both roles with clear validation and auth error handling.
- Support immediate post-registration access when Supabase creates a session at signup.
- Preserve the confirmation-required path when the Supabase project requires email verification.
- Keep Google OAuth login and registration role-aware for both employer and job seeker flows.
- Remove the mock-auth bypass so every application auth path goes through real Supabase session and OAuth handling.
- Document the implementation in sprint artifacts aligned with the delivered code.

## User Stories
- As a new employer, I want to register with email/password and enter the employer workspace as soon as my session is active.
- As a new job seeker, I want to register with email/password or Google and land in the correct protected area.
- As a returning user, I want login to send me back to the right workspace based on my saved role.
- As the platform, I want signup behavior to work in both confirmation-required and immediate-session Supabase configurations.

## Technical Notes
- Keep role persistence in Supabase auth metadata.
- Use server actions for email signup and login.
- Use Supabase OAuth callback handling for Google sign-in.
- Continue enforcing role-based route guards in middleware and page-level access checks.
- Keep automated email/password E2E coverage environment-driven with real Supabase credentials instead of synthetic mock query parameters or cookies.

## Out Of Scope
- Password reset and recovery flows.
- Employer job-description generation.
- Job seeker interview-preparation workflows beyond the protected landing shell.

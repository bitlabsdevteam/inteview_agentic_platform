# Sprint v3 PRD

## Sprint Overview
Sprint v3 closes the remaining gaps in the account lifecycle so authentication feels complete from first registration through authenticated usage and logout. The sprint keeps the existing Supabase role-aware foundation, adds a session-aware profile/logout experience, and makes the selected registration role deterministically control the first in-app destination.

## Goals
- Finish a full login and logout flow that works for both employer and job seeker accounts.
- Show authenticated users a profile area with a logout action instead of public login/register actions.
- Keep role selection mandatory during registration for all signup methods.
- Redirect newly registered employers to `/employer` and newly registered job seekers to `/job-seeker` whenever an active session exists.
- Add regression coverage for authenticated navigation, logout, and role-specific registration outcomes.

## User Stories
- As a new employer, I want to choose `Employer` during registration and land on the employer page after signup so I can start the employer workflow immediately.
- As a new job seeker, I want to choose `Job Seeker` during registration and land on the correct protected area so the app matches my intent from the start.
- As an authenticated user, I want the app header to show my profile state and logout option instead of login/register actions so the signed-in experience is unambiguous.
- As a returning user, I want login to restore my session and route me back to the workspace tied to my saved role.
- As the platform, I want logout to clear the Supabase session and return the user to a public entry point so protected routes stay secure.

## Technical Architecture
- Frontend: Next.js App Router pages, shared route shell, and authenticated header/profile components.
- Auth: Supabase Auth for email/password, Google OAuth, server-side session reads, and server-triggered sign-out.
- Role routing: role stored in Supabase auth metadata and resolved through shared route helpers.
- Testing: Vitest for auth contracts and Playwright for registration, login, authenticated navigation, and logout regression flows.

```text
Visitor
  |
  v
Public Routes (/ , /register, /login)
  |
  +--> Register
  |      |
  |      +--> Choose role: employer | job_seeker
  |      +--> Email/password or Google OAuth
  |      +--> Save role in Supabase user metadata
  |      +--> Session active?
  |             |
  |             +--> yes --> Redirect by role
  |             |              employer -> /employer
  |             |              job_seeker -> /job-seeker
  |             |
  |             +--> no --> Confirmation-required message
  |
  +--> Login
         |
         +--> Read session + saved role
         +--> Redirect by role

Authenticated App Shell
  |
  +--> Header / Profile area
  |      |
  |      +--> Show user identity
  |      +--> Show Logout action only
  |
  +--> Protected Route
         |
         +--> /employer or /job-seeker

Logout
  |
  +--> Supabase signOut
  +--> Clear session cookies
  +--> Redirect to /
```

### Data Flow
1. User opens a public route and starts registration or login.
2. Registration requires a role choice before auth submission is accepted.
3. The auth layer creates or restores the Supabase session and reads the saved role from user metadata.
4. Route helpers resolve the destination as `/employer`, `/job-seeker`, or role completion if metadata is still incomplete.
5. Once authenticated, the shared app shell renders profile state and exposes logout instead of login/register.
6. Logout clears the server-side session and returns the user to a public route where protected pages are no longer accessible.

## Auth Surface Checklist

### Public Auth Entry Points
- [x] `/` landing page in `src/app/page.tsx`
  - Current state: shows public `Log In`, `Create Account`, `Enter as Employer`, and `Enter as Job Seeker` actions.
  - v3 action: keep public actions for anonymous users and add a session-aware branch so authenticated users see profile/logout state instead of generic auth CTAs.
- [x] `/login` in `src/app/login/page.tsx` and `src/app/login/login-screen.tsx`
  - Current state: route guard already redirects authenticated users away; the screen still hardcodes public nav links.
  - v3 action: move nav rendering behind a shared session-aware header contract so the screen does not own public auth controls directly.
- [x] `/register` in `src/app/register/page.tsx` and `src/app/register/registration-screen.tsx`
  - Current state: requires role selection before submit and renders public nav links directly in the screen.
  - v3 action: preserve mandatory role selection and route-aware redirects while replacing duplicated nav with the shared authenticated/unauthenticated header.
- [x] `/auth/complete-role` in `src/app/auth/complete-role/page.tsx` and `src/app/auth/complete-role/complete-role-screen.tsx`
  - Current state: only authenticated no-role users should reach this route, but the screen still displays public login/register links.
  - v3 action: remove misleading public auth actions from this authenticated recovery surface and align it with profile/logout state.
- [x] Google auth start and callback endpoints in `src/app/auth/google/route.ts`, `src/app/auth/callback/route.ts`, and `src/lib/auth/google-oauth.ts`
  - Current state: already carries intent and role through OAuth and resolves a destination after callback.
  - v3 action: preserve role-aware callback behavior while ensuring the post-auth UI contract matches the resolved authenticated state.

### Protected Routes And Route Enforcement
- [x] `/employer` in `src/app/employer/page.tsx`
  - Current state: protected by `enforceRouteAccess("/employer")` but the rendered shell still shows public login/register links.
  - v3 action: switch the employer shell to the shared authenticated header/profile pattern and surface logout as the account action.
- [x] `/job-seeker` in `src/app/job-seeker/page.tsx`
  - Current state: protected by `enforceRouteAccess("/job-seeker")` but the rendered shell still shows public login/register links.
  - v3 action: switch the job seeker shell to the shared authenticated header/profile pattern and surface logout as the account action.
- [x] Route guard and redirect utilities in `src/lib/auth/enforce-route-access.ts`, `src/lib/auth/route-guard.ts`, and `src/lib/routes.ts`
  - Current state: anonymous users are blocked from protected routes, authenticated users bypass auth pages, and users without roles are routed to completion.
  - v3 action: preserve these redirects while adding logout coverage that proves session loss returns protected-route access to the public auth flow.

### Shared Navigation And Shell Surfaces
- [x] `src/components/route-shell.tsx`
  - Current state: defines a reusable nav contract with hardcoded `Login` and `Register` links but is not yet session-aware.
  - v3 action: promote this file or a sibling shared component into the main authenticated header/profile contract used across routes.
- [x] `src/components/employer-chat-shell.tsx`
  - Current state: duplicates navigation inline instead of consuming a shared authenticated shell.
  - v3 action: replace duplicated auth links with the shared profile/logout header.
- [x] `src/components/job-seeker-shell.tsx`
  - Current state: duplicates navigation inline instead of consuming a shared authenticated shell.
  - v3 action: replace duplicated auth links with the shared profile/logout header.
- [x] Root layout in `src/app/layout.tsx`
  - Current state: only renders children and global styles; it does not read session state or inject shared account UI.
  - v3 action: evaluate whether the authenticated header should live at the layout layer or in a shared route shell that can safely read server session state.

## Out Of Scope
- Password reset, forgot-password, and account recovery flows.
- Employer job-description generation beyond the existing protected shell.
- Job seeker interview preparation beyond the existing protected shell.
- Admin account management, tenant switching, or multi-role accounts.
- Deep profile management beyond the minimal profile display needed to support logout.

## Dependencies
- Existing Sprint v1 and v2 Supabase auth wiring remains the baseline.
- Supabase project configuration for email/password auth and Google OAuth remains valid.
- Shared route helpers continue to map `employer` to `/employer` and `job_seeker` to `/job-seeker`.
- The app layout or shared shell is available for adding authenticated header/profile UI.
- Test credentials and Playwright auth environment remain available for end-to-end auth validation.

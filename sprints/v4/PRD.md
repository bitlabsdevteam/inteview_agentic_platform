# Sprint v4 PRD

## Sprint Overview
Sprint v4 upgrades the authenticated product shell into a professional, role-aware top navigation experience for an AI agentic solution company. The sprint also hardens the employer/job-seeker boundary so an employer session cannot see job-seeker navigation or enter the job-seeker workspace through direct routing.

This sprint assumes the request phrase "Employer MST not allowed to login to Job Seeker" means "Employer must not be allowed to log in to, navigate to, or access the Job Seeker area."

## Goals
- Replace the basic shared header with a polished top menu bar that feels credible for an AI agentic hiring platform.
- Show employer users only employer-appropriate authenticated navigation and profile controls after successful login.
- Remove the `Job Seeker` top-menu option for authenticated employer sessions.
- Block employer sessions from directly accessing `/job-seeker` and route them back to `/employer`.
- Improve the visual system across the main shells so the product feels professional, elegant, and consistent.
- Add regression coverage for role-scoped navigation, employer route enforcement, and responsive menu behavior.

## User Stories
- As an employer, I want the authenticated top menu to show my employer workspace and profile only so I never see candidate-only actions.
- As an employer, I want attempts to open `/job-seeker` to redirect me back to `/employer` so the product respects my account role.
- As a platform operator, I want role-specific navigation rules to be tested so future UI changes do not expose the wrong module.
- As a prospective customer, I want the interface to look like a professional AI agentic solution company so the product feels trustworthy.
- As a returning user on desktop or mobile, I want the top menu to remain clear, elegant, and usable across viewport sizes.

## Technical Architecture
- Frontend: Next.js App Router pages, shared `AccountHeader`, shared route shells, and global CSS tokens.
- Auth: Supabase session reads through the existing server-side account header and route guard contracts.
- Role routing: `AccountRole` metadata continues to drive destination and protected-route access.
- UI system: CSS variables and reusable class names define spacing, color, borders, focus, and responsive behavior.
- Testing: Vitest for navigation and guard contracts; Playwright for employer authenticated UI and direct-route access behavior.

```text
Supabase Session
  |
  v
getAccountHeaderState()
  |
  +--> Anonymous
  |      |
  |      +--> Public menu: Home, Login, Register, Employer, Job Seeker
  |
  +--> Employer
  |      |
  |      +--> Top menu: Home, Employer
  |      +--> Profile control: employer identity + Logout
  |      +--> Direct /job-seeker request redirects to /employer
  |
  +--> Job Seeker
         |
         +--> Top menu: Home, Job Seeker
         +--> Profile control: job seeker identity + Logout
         +--> Direct /employer request redirects to /job-seeker

Authenticated Route Request
  |
  v
resolveRouteGuardRedirect()
  |
  +--> role matches route    --> render workspace
  +--> role mismatches route --> redirect to role home
  +--> missing role          --> /auth/complete-role
  +--> anonymous             --> /login
```

### Data Flow
1. A user logs in through the existing Supabase-backed auth flow.
2. The app reads the authenticated user and role metadata on the server.
3. The shared account header derives a role-scoped menu from the session state.
4. Employer sessions receive employer-only navigation and profile/logout controls.
5. Route guards evaluate direct protected-route requests and redirect role mismatches before rendering the page.
6. Shared CSS applies the polished top-menu visual language across public and protected shells.

## UI And UX Direction
- Use a fixed-quality top menu pattern with clear brand, concise role-scoped navigation, and a compact profile/logout area.
- Favor a refined enterprise AI look: restrained contrast, crisp borders, intentional whitespace, accessible focus states, and clear interaction affordances.
- Keep cards limited to actual repeated or framed content; shells and page sections should feel like product surfaces rather than marketing panels.
- Avoid showing internal debug/session text in the user-facing interface.
- Ensure menu labels do not wrap awkwardly or collide with profile controls on mobile.

## Out Of Scope
- New employer job-description generation features.
- New job seeker interview-preparation or interview execution features.
- Multi-role accounts or tenant switching.
- Admin role management.
- Password reset, account deletion, or profile editing beyond the existing profile/logout control.
- A full design system package or component library extraction.

## Dependencies
- Sprint v3 authenticated header, logout, and role-aware route guard behavior remains the baseline.
- Supabase auth metadata continues to store `employer` and `job_seeker` roles.
- Existing `AccountHeader`, `RouteShell`, `EmployerChatShell`, and `JobSeekerShell` components are available for UI consolidation.
- Existing Vitest and Playwright infrastructure remains available for regression coverage.

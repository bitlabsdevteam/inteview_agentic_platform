# Sprint v13 PRD

## Sprint Overview
Sprint v13 executes a focused **Step 1 + Step 2 delivery slice** from `Architecture_Design.md`:
- Step 1: Role Intake and Requirement Discovery
- Step 2: Job Description Drafting and Quality Controls

v12 delivered persistent JD chat, memory, compaction, and scoped retrieval for iterative draft revision. v13 adds the missing upstream requirement-discovery loop and integrates deterministic quality controls before employer review/publish actions.

## Goals
- Add a structured requirement discovery workflow that converts unstructured employer intent into normalized role requirements.
- Keep the employer in a chat-first flow while producing deterministic structured role profile artifacts.
- Add JD quality-control passes (completeness, readability, discriminatory-language checks, contradiction checks) before `needs_review`.
- Keep publish guardrails unchanged: no autonomous publish, explicit employer approval required.
- Maintain strict server-side prompt separation, scoped context, and owner/job/session authorization boundaries.

## User Stories
- As an employer, I want the agent to clarify missing or conflicting role requirements before drafting so I get a stronger JD faster.
- As an employer, I want requirements normalized into a reusable role profile so every draft revision stays consistent.
- As an employer, I want quality warnings surfaced in plain language before review so I can fix issues before publishing.
- As a platform owner, I want auditable Step 1 and Step 2 artifacts tied to employer/job/session scope.

## Scope

### Step 1: Role Intake and Requirement Discovery
- Add role-profile extraction from employer chat turns with explicit fields:
  - role title, seniority/level, team/department, location policy, compensation range/status
  - must-have requirements, nice-to-have requirements, business outcomes, interview loop intent
  - unresolved constraints and detected conflicts
- Add targeted clarification prompts (max 3 per turn) when requirements are incomplete or contradictory.
- Persist normalized requirement profile as session-linked artifacts and keep them updateable by later employer corrections.

### Step 2: JD Drafting and Quality Controls
- Generate JD drafts from the normalized role profile first, then merge latest employer turn deltas.
- Add deterministic quality controls prior to `needs_review`:
  - missing critical section check
  - readability and verbosity guardrails
  - discriminatory/exclusionary phrasing detection with rewrite guidance
  - requirement contradiction detection (for example level vs scope vs compensation conflicts)
- Persist quality results and expose actionable fix recommendations in the employer job detail chat panel.

## Technical Architecture
- Continue using Next.js + Supabase + custom orchestration + OpenAI structured output.
- Keep v12 memory and scoped retrieval as the context backbone.
- Add new Step 1/2 modules under `src/lib/agents/job-posting/`:
  - `role-profile.ts`: role profile schema, validation, normalization, conflict detection.
  - `quality-controls.ts`: deterministic quality checks and issue contracts.
  - `requirement-discovery.ts`: clarification-question selection and update logic.
- Add persistence for requirement/quality artifacts (job/session-scoped) with RLS.
- Update prompt assembly to include:
  - normalized role profile block
  - unresolved constraints block
  - quality control policy block
  - untrusted employer input isolation tags

```text
Employer chat turn
  |
  +--> Step 1 requirement discovery
  |      +--> normalize role profile
  |      +--> detect conflicts/missing constraints
  |      +--> ask bounded clarifications
  |
  +--> Step 2 draft generation
         +--> draft from normalized profile + latest deltas
         +--> quality control passes
         +--> revision recommendations + persistence
  |
  v
Job detail chat UI (readiness + quality + follow-up)
```

## Data Model Changes
- Add `employer_job_role_profiles` (owner/job/session scoped):
  - normalized profile JSON, unresolved constraints, conflicts, confidence, updated timestamps
- Add `employer_job_quality_checks` (owner/job/session scoped):
  - check type, status (`pass|warn|fail`), issue text, suggested rewrite, metadata
- Add indexes for `(employer_user_id, employer_job_id, updated_at desc)` on both tables.
- Enforce RLS with `auth.uid() = employer_user_id` for read/create/update.

## API And Interface Changes
- Extend `POST /api/employer/jobs/[id]/agent-chat` response with:
  - `roleProfileSummary`
  - `qualityChecks`
  - `readinessFlags`
- Keep request shape backward-compatible (`message`, optional `sessionId`).
- Keep existing publish endpoints unchanged; quality warnings influence readiness UI but do not bypass manual approval.

## Acceptance Criteria
- Employer chat can iteratively produce and update a normalized role profile from unstructured input.
- JD revisions reflect normalized requirements and latest employer corrections.
- Quality checks run on each revision and return deterministic warnings/issues.
- `Mark Ready For Review` remains blocked by existing lifecycle rules plus surfaced critical Step 2 failures.
- Unauthorized users and cross-owner access are denied for all new Step 1/2 artifacts and API paths.

## Testing Strategy
- Unit tests:
  - role profile normalization and conflict detection
  - clarification question bounding and prioritization
  - quality-check pass/warn/fail rules
- Integration tests:
  - job chat turn persists role profile + quality artifacts
  - scoped retrieval includes role/quality context without leakage
- API tests:
  - auth/role/ownership enforcement and response contracts
- E2E tests:
  - employer iterates JD in chat, resolves quality warnings, then proceeds to review flow

## Out Of Scope
- Autonomous publishing or external channel posting automation.
- Candidate-facing role intake or JD editing.
- Full Step 3 multi-channel publish orchestration.

## Dependencies
- v12 memory/compaction/scoped retrieval flow.
- Existing v6-v12 job-posting inference and lifecycle controls.
- Supabase migration and RLS patterns already used across employer modules.

# Sprint v15 PRD

## Sprint Overview
Sprint v15 removes the staged employer job-posting pipeline UI and replaces it with a single conversation-driven workspace. After the employer enters a prompt and the system creates the content, the page should show the full generated artifact in read-only mode on the left and a dedicated agent chat panel on the right for all revisions.

This sprint keeps the employer assistant approval-driven and audit-safe, but it changes the interaction model: no stage bar, no inline editing forms, no `Send To Agent` button, and no extra right-rail widgets beyond the chat thread and composer.

## Goals
- Remove the visible stage model from the employer job detail experience.
- Render the created job content as a single read-only workspace instead of editable form fields.
- Keep all content changes flowing through employer-to-agent chat rather than direct field editing.
- Simplify the right rail so it contains only the agent chat thread and composer.
- Let the employer press `Enter` to send a chat turn, while preserving safe review and publish controls.

## User Stories
- As an employer, I want to see the full generated hiring artifact in one place so I can review it quickly without switching stages.
- As an employer, I want the content shown in read-only mode so the agent remains the controlled path for revisions.
- As an employer, I want a clean chat panel on the right with no extra widgets so I can focus on asking for changes.
- As an employer, I want pressing `Enter` to send my instruction immediately so revising the artifact feels conversational.
- As a platform owner, I want all revisions to remain grounded in the persisted job context and guarded by employer-only authorization.

## Scope

### Single Read-Only Workspace
- Replace the stage-based page shell with a two-column layout:
  - left: full generated artifact in read-only mode
  - right: agent chat only
- Show the created content as a single review surface instead of separate Stage 1, Stage 2, and Stage 3 panels.
- Present the generated artifact as structured sections, using persisted job data and related summaries already available in the employer workspace.

### Read-Only Content Rendering
- Remove inline input controls for job-posting editing and interview-structure editing from the main workspace.
- Render all created content in display mode only, including generated draft sections and supporting summaries needed for employer review.
- Keep publish/review controls subject to existing approval rules, but do not treat them as pipeline stages.

### Chat-Only Right Rail
- Keep the right panel focused on:
  - chat thread
  - chat composer
  - inline error/loading state for chat
- Remove extra right-rail sections such as session memory cards, role profile summary cards, follow-up panels, and quality-warning side widgets from the chat rail.
- Remove the `Send To Agent` button from the chat composer.
- Submit a chat turn when the employer presses `Enter`.
- Support `Shift+Enter` for a newline so long instructions remain possible without restoring a visible send button.

### Agent-Driven Revision Loop
- After each employer chat turn, refresh the read-only artifact so the latest generated content is reflected on the left.
- Keep the agent as the only workspace mechanism for revising the job artifact.
- Preserve server-side prompt assembly, employer scoping, audit logging, and deterministic review/publish authorization checks.

## Technical Architecture
- Continue using Next.js + Supabase + custom orchestration + OpenAI models.
- Remove the page's dependency on stage-aware rendering for the employer job detail route.
- Introduce a single read-only workspace view model assembled from:
  - employer job draft
  - role profile summary
  - quality/review status
  - interview blueprint summary or equivalent generated interview content already associated with the job
- Keep all mutation paths on the server through the existing agent-chat orchestration flow.
- Update the client chat component to submit on keyboard interaction rather than a dedicated button click.

```text
Employer Job Workspace
  |
  +--> Left: Read-Only Generated Artifact
  |      +--> job title / status
  |      +--> role profile summary
  |      +--> generated job posting
  |      +--> interview structure summary
  |      +--> review / quality notes
  |
  +--> Right: Agent Chat Only
         +--> thread
         +--> composer
         +--> Enter submits
         +--> Shift+Enter inserts newline
```

## API And Interface Changes
- Update the employer job detail page to render one read-only artifact view instead of stage-specific panels.
- Update the chat component contract so the right rail can stay minimal while still refreshing the left-side artifact after revisions.
- Remove UI reliance on `activeStage`, `stageSummary`, and stage-navigation query params for this page.
- Remove the visible interview-blueprint editing form from the employer job detail route.
- Keep chat route responses aligned to the artifact refresh cycle so the page can re-render the latest content after each agent turn.

## Acceptance Criteria
- The employer job detail page no longer renders a stage bar or stage-specific panels.
- The left side shows the created content in read-only mode with no editable input fields for the main artifact.
- The right side contains only the chat thread and composer.
- The `Send To Agent` button is removed.
- Pressing `Enter` in the chat composer sends the message, and `Shift+Enter` inserts a newline.
- After a successful chat revision, the read-only artifact reflects the updated generated content.
- Employer-only authorization and existing approval gates remain enforced.

## Testing Strategy
- Unit tests:
  - read-only workspace view-model derivation
  - chat keyboard submission behavior
- Integration tests:
  - employer job detail route renders read-only artifact sections from persisted data
  - chat route still returns authorized revision results for the same job scope
- UI tests:
  - no stage bar
  - no editable artifact form fields
  - right rail contains only chat content
  - no `Send To Agent` button
- E2E tests:
  - employer creates/refines a job, sees read-only artifact, sends a chat turn with `Enter`, and sees the artifact update

## Out Of Scope
- Rebuilding the underlying job-posting generation pipeline from scratch.
- Candidate-facing interview runtime, voice streaming, or scheduling flows.
- Automatic external publishing, outreach, rejection, or other irreversible actions without employer approval.
- A generic multi-purpose assistant UI outside the employer job workspace.

## Dependencies
- v14 agent-chat and job-detail route foundations.
- Existing employer job draft, role-profile, and interview-blueprint persistence.
- Existing review/publish authorization rules and server-side prompt versioning.

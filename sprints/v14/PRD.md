# Sprint v14 PRD

## Sprint Overview
Sprint v14 revises the employer job-detail UI into a **job posting creation pipeline** instead of a single long editing workspace. The employer should move through a visible status bar with ordered stages: first `Build Job Posting`, then `Design Interview Structure`, then `Review And Approve`.

This sprint extends v13's requirement-discovery and JD quality controls by adding a second design phase for interview configuration: question design, response mode (`text` or `voice_agent`), tone, parsing strategy, benchmark/rubric definition, and stage readiness summaries before review.

## Goals
- Replace the current mixed job-detail layout with a stage-based employer pipeline UI and persistent status bar.
- Make `Build Job Posting` the first explicit step, grounded in the normalized role profile and JD quality findings delivered in v13.
- Add an `Interview Structure Design` stage where the employer assistant helps configure question sets, response mode, tone, parsing strategy, and benchmark/rubric expectations.
- Keep the assistant employer-owned and approval-driven: it recommends and prepares interview structure decisions, but does not auto-publish, auto-contact candidates, or make final hiring decisions.
- Surface readiness at stage level so the employer can see what is complete, what is blocked, and what still needs clarification before review.

## User Stories
- As an employer, I want a visible multi-stage status bar so I know where I am in the job creation process and what comes next.
- As an employer, I want to finish the job posting first before I move into interview design so the interview structure stays aligned to the approved role requirements.
- As an employer, I want to configure interview questions, text versus voice-agent mode, tone, parsing strategy, and rubric benchmarks in one structured stage so the downstream interview experience is intentional instead of ad hoc.
- As an employer, I want the assistant to explain missing interview signals and recommend the next setup action so I can finish the pipeline faster without relying on a human recruiter.
- As a platform owner, I want stage completion, interview configuration artifacts, and review blockers persisted with audit-safe scope and ownership rules.

## Scope

### Stage 1: Build Job Posting
- Keep the role profile, clarification questions, session memory, and quality warnings from v13.
- Reframe the current job-detail page so JD drafting is explicitly Stage 1 in the pipeline status bar.
- Show completion criteria for Stage 1:
  - normalized role profile exists
  - critical role constraints are resolved or acknowledged
  - critical JD quality checks are not failing
  - core job fields remain editable with human review intact

### Stage 2: Design Interview Structure
- Add a dedicated interview-design stage for per-job interview configuration.
- Persist and render structured interview blueprint fields:
  - interview plan title and objective
  - interview stages or sections
  - question set for each stage
  - response mode: `text` or `voice_agent`
  - tone profile such as `direct`, `supportive`, `neutral`, `high-precision`
  - parsing strategy such as `keyword_match`, `evidence_extraction`, `rubric_scoring`, `hybrid`
  - benchmark expectations, pass signals, strong signals, and missing-signal triggers
  - interviewer/employer notes and approval guidance
- Let the employer assistant recommend interview structure updates based on the role profile and unresolved hiring risks.
- Keep this sprint focused on interview design configuration, not live candidate interview execution.

### Stage 3: Review And Approve
- Add a final stage summary that combines JD readiness and interview-design readiness.
- Block `Mark Ready For Review` when critical Stage 1 or Stage 2 blockers remain.
- Keep `Publish Job` behind explicit human review and existing lifecycle controls.

## Technical Architecture
- Continue using Next.js + Supabase + custom orchestration + OpenAI models.
- Reuse v13 artifacts:
  - `role-profile.ts`
  - `requirement-discovery.ts`
  - `quality-controls.ts`
  - job/session memory and chat orchestration
- Add a new interview-design domain under `src/lib/agents/job-posting/` for deterministic interview blueprint contracts and persistence.
- Extend the employer job detail route so the UI is stage-aware and can render different panels per active stage while keeping one job-owned workspace.
- Keep prompt layering server-side only and isolate employer free text as untrusted input during interview-plan generation and revision.

```text
Employer Job Detail Workspace
  |
  +--> Pipeline Status Bar
  |      1. Build Job Posting
  |      2. Design Interview Structure
  |      3. Review And Approve
  |
  +--> Stage 1 Panel
  |      +--> role profile summary
  |      +--> JD draft editing
  |      +--> quality warnings
  |
  +--> Stage 2 Panel
  |      +--> interview blueprint form
  |      +--> questions
  |      +--> text vs voice-agent mode
  |      +--> tone + parsing strategy
  |      +--> benchmarks / scoring signals
  |
  +--> Stage 3 Panel
         +--> readiness summary
         +--> review blockers
         +--> submit for review / publish controls
```

## Data Model Changes
- Add `employer_job_interview_blueprints`:
  - `id`
  - `employer_user_id`
  - `employer_job_id`
  - `status`
  - `title`
  - `objective`
  - `response_mode`
  - `tone_profile`
  - `parsing_strategy`
  - `benchmark_summary`
  - `approval_notes`
  - `created_at`
  - `updated_at`
- Add `employer_job_interview_questions`:
  - `id`
  - `employer_user_id`
  - `employer_job_id`
  - `interview_blueprint_id`
  - `stage_label`
  - `question_order`
  - `question_text`
  - `intent`
  - `evaluation_focus`
  - `strong_signal`
  - `failure_signal`
  - `follow_up_prompt`
  - `created_at`
  - `updated_at`
- Add indexes for employer/job scope and question ordering.
- Enforce owner-scoped RLS using `auth.uid() = employer_user_id`.

## API And Interface Changes
- Extend job-detail loader and chat/API contracts to return:
  - active pipeline stage
  - stage completion summary
  - interview blueprint summary
  - interview question list
- Add deterministic helpers for:
  - stage completion state
  - interview blueprint validation
  - review gate aggregation across Stage 1 and Stage 2
- Update the employer job detail UI to render:
  - top status bar with stage states (`current`, `complete`, `blocked`, `upcoming`)
  - stage-specific main panel
  - assistant recommendations tied to the active stage

## Acceptance Criteria
- The employer job detail page renders a visible three-stage pipeline status bar.
- Stage 1 clearly represents job posting creation and keeps v13 role profile and quality controls intact.
- Stage 2 supports persistent interview blueprint editing with question sets, response mode, tone, parsing strategy, and benchmark fields.
- The employer assistant can recommend interview-structure changes grounded in role requirements and missing signals.
- Review readiness aggregates both JD quality state and interview-design completeness before enabling review.
- Unauthorized users cannot read or mutate interview blueprint data outside their employer scope.

## Testing Strategy
- Unit tests:
  - pipeline stage-state derivation
  - interview blueprint validation and defaults
  - review gate aggregation across Stage 1 and Stage 2
- Integration tests:
  - job detail loader returns stage summary plus interview blueprint data
  - interview blueprint persistence respects employer/job scope
- API tests:
  - agent chat response contract includes stage-aware metadata
  - server actions reject unauthorized interview blueprint updates
- E2E tests:
  - employer completes Stage 1, moves to Stage 2, configures interview structure, then reaches review with expected blockers/warnings

## Out Of Scope
- Real-time voice interview runtime, speech-to-text streaming, or candidate-facing voice sessions.
- Automatic candidate outreach, scheduling, or final hiring decisions.
- Multi-channel job publishing automation beyond the current guarded review/publish lifecycle.
- Full interviewer panel management or live scorecard submission flows.

## Dependencies
- v13 role profile, clarification, quality-control, and review-gate foundations.
- Existing employer job detail route, job lifecycle actions, and server-side prompt assembly.
- Existing Supabase migration and RLS patterns used in employer and screening-kit persistence.

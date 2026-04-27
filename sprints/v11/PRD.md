# Sprint v11 PRD

## Sprint Overview
Sprint v11 starts `Architecture_Design.md` Step 5 as **Step 5A: Employer Recruiting Assistant Foundation**. The product direction is an employer-only AI personal assistant that advises the employer through recruiting work, recommends what to do next, and prepares high-quality actions so the company can reduce or eliminate dependency on human recruiting agents.

This sprint should not build a generic screening tool or candidate-facing portal. It should create the first employer assistant loop: read the current job and candidate context, identify the highest-value recruiting next step, explain why, and generate a screening kit or follow-up recommendation the employer can review.

## Goals
- Establish the employer AI assistant as the primary recruiting workflow surface, not just a job-posting helper.
- Generate role-specific recruiting advice from employer job requirements, candidate profiles, score signals, and uncertainty gaps.
- Create structured assistant recommendations such as `screen_candidate`, `request_more_signal`, `review_candidate`, and `improve_job_requirements`.
- Generate employer-reviewed screening kits as one assistant action for collecting better candidate signal.
- Preserve human checkpoints: the assistant can advise, prepare, and explain, but cannot make final hiring decisions.

## User Stories
- As an employer, I want a personal AI recruiting assistant so that I know what to do next without hiring a human recruiter.
- As an employer, I want the assistant to explain how to get better candidates so that I can improve the pipeline instead of only reading scores.
- As an employer, I want the assistant to recommend screening questions for a candidate so that I can collect missing evidence consistently.
- As an employer, I want advice grounded in job requirements and candidate evidence so that I can trust the recommendation.
- As a platform owner, I want every assistant recommendation stored with audit metadata so that the workflow remains reviewable and defensible.

## Technical Architecture
- Stack: Next.js employer pages/server actions, custom assistant orchestration modules, Supabase/Postgres, OpenAI Responses API, strict TypeScript schemas.
- New employer assistant module boundary:
  - `schema.ts`: assistant recommendation, next-step action, screening kit, rubric, and uncertainty contracts.
  - `prompts.ts`: versioned prompt assembly for employer-only recruiting advice.
  - `advisor.ts`: deterministic next-step rules and model-backed recommendation generation.
  - `screening-kit.ts`: question and rubric generation for missing candidate signals.
  - `orchestrator.ts`: context assembly, model request, JSON validation, bounded repair/retry, and failure reasons.
  - `persistence.ts`: owner/job/candidate-scoped recommendation and screening kit storage.
  - Employer candidate profile UI: assistant panel that shows recommended next step, rationale, evidence, and generated screening kit.

```text
Employer Job + Candidate Profiles + Scores (Step 4)
        |
        v
Employer Recruiting Assistant
  |-- Pipeline Context Reader
  |-- Candidate Evidence Reader
  |-- Missing-Signal Detector
  |-- Next-Step Advisor
  |-- Screening Kit Generator
  |-- Prompt Version + Schema Validation
  |-- Bounded Repair/Retry
        |
        v
Assistant Recommendation + Rationale + Screening Kit
        |
        v
Postgres / Supabase with employer-job-candidate scope
        |
        v
Employer Assistant UI (human approval before action)
```

### Data Flow
1. Employer opens a candidate profile or candidate workspace for a job.
2. Employer asks the assistant what to do next, or starts assistant recommendation generation.
3. Server verifies employer ownership of the job and candidate records.
4. Assistant assembles scoped job requirements, candidate profile scores, evidence snippets, and uncertainty gaps.
5. Advisor returns strict JSON with recommended next action, rationale, evidence references, risk flags, and optional screening kit.
6. Server validates, repairs/retries if needed, and persists the recommendation plus audit metadata.
7. Employer UI displays the assistant recommendation and prepared screening kit; any hiring decision remains manual.

## Out Of Scope
- Candidate-facing answer submission UI.
- Automatic answer scoring from live candidate responses.
- Automatic advance, hold, reject, offer, or final hiring decisions.
- Sending external candidate communications without employer approval.
- Interview planning and panel enablement (Step 6).
- Long-term rubric effectiveness analytics (Step 10).

## Dependencies
- Completed Step 4 candidate profile, scoring, filter, and retry workspace from v9/v10.
- Existing employer job and candidate profile server-side authorization helpers.
- Existing prompt version/checksum and schema validation patterns.
- Supabase migrations and RLS conventions used by candidate intake/scoring tables.

## Follow-Up Sprint Boundary
Step 5 is larger than one sprint. `v11` establishes the employer personal recruiting assistant and its first actionable recommendation loop. `v12` should add candidate-facing answer collection and answer scoring. Later Step 5 sprints should expand the assistant into pipeline coaching, candidate comparison, and recruiter-quality workflow automation.

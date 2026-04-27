# Sprint v9 PRD

## Sprint Overview
Sprint v9 starts `Architecture_Design.md` Step 4: Candidate Intake and Profile Structuring.

Step 4 is too large for one sprint if implemented with production guardrails, so delivery is split into multiple sprint slices:
- v9 (this sprint): candidate intake foundation, structured extraction pipeline, persisted candidate profile records, and baseline privacy controls.
- v10 (follow-on for Step 4 completion): profile scoring calibration, recruiter-grade search/filter UX, and extraction quality hardening.

## Goals
- Add employer-owned candidate intake records linked to jobs.
- Ingest candidate resume artifacts through Supabase storage with secure ownership boundaries.
- Extract structured candidate profile fields with deterministic schema validation.
- Persist confidence-scored candidate profiles for downstream screening.
- Enforce Step 4 privacy controls: data minimization and scoped model context.

## User Stories
- As an employer, I want to add candidate applications to a specific job so I can manage applicants without external recruiters.
- As an employer, I want parsed candidate summaries from resumes so I can review fit quickly.
- As a platform owner, I want structured extraction output with confidence fields so later screening is consistent.
- As a platform owner, I want candidate data protected by RLS and scoped prompts so sensitive data is not over-shared.

## Technical Architecture
- Data model: add candidate intake and profile tables scoped by `employer_user_id` and `employer_job_id`.
- Storage: add secure file path conventions for candidate uploads in Supabase storage.
- Extraction orchestration: add server-only extraction service using OpenAI structured output.
- Validation: strict runtime schema validation for extracted candidate fields; reject malformed payloads.
- Persistence: store canonical parsed profile plus per-field confidence and extraction audit metadata.
- UI: add an employer candidate intake and candidate profile review surface under `/employer/jobs/[id]/candidates`.

```text
Employer Job Candidate Intake
  |
  +--> Upload resume/document metadata
  |
  +--> Persist candidate intake record (owner-scoped)
  |
  +--> Trigger extraction orchestration
  |      +--> Build scoped prompt (no unnecessary PII)
  |      +--> OpenAI structured extraction
  |      +--> Schema validate output
  |
  +--> Persist candidate profile + confidence fields
  |
  v
Employer candidate list/profile review
```

### Data Flow
1. Employer opens job candidate intake route and submits candidate identity + attachment.
2. Server action verifies employer authorization for the target job.
3. Candidate intake record is created and linked to the job.
4. Extraction service reads permitted source text and sends scoped prompt to model.
5. Structured output is validated against runtime schema.
6. Candidate profile and extraction metadata are persisted for review.

## Out Of Scope
- Automated candidate rejection/advancement decisions.
- Full screening interview automation (covered by Step 5).
- Interview kit generation and scheduling automation.
- Cross-company candidate sharing or marketplace discovery.

## Dependencies
- Existing employer job lifecycle and role-guard flows from v5-v8.
- Existing prompt assembly and OpenAI server integration from v6.
- Supabase project with storage bucket configuration and RLS enabled.
- Existing security/guardrail constraints in `AGENTS.md` and `Architecture_Design.md`.

## Step 4 Split Plan
- v9: intake + extraction + persistence + baseline UI + guardrails.
- v10: extraction quality tuning, candidate scoring model, richer employer candidate workspace, and operational reliability hardening.


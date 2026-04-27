# Sprint v10 PRD

## Sprint Overview
Sprint v10 completes the remaining `Architecture_Design.md` Step 4 scope after v9 foundation delivery.

v9 delivered intake + extraction + persistence + baseline review UI. v10 focuses on quality and recruiter workflow readiness:
- profile scoring calibration against hard requirements
- recruiter-grade candidate search/filter workspace
- extraction quality metrics and observability
- operational retry/failure handling for extraction reliability

## Goals
- Add deterministic candidate fit scoring aligned to job requirements and confidence fields.
- Add employer-facing candidate filtering and sorting for faster shortlist decisions.
- Add extraction quality metrics and audit visibility without exposing sensitive internals.
- Add safe retry paths for extraction failures and malformed model output.

## User Stories
- As an employer, I want to rank candidates by requirement fit so I can prioritize review quickly.
- As an employer, I want to filter candidates by skills, confidence, and status so I can find relevant profiles.
- As a platform owner, I want extraction reliability and retry controls so candidate processing is resilient.
- As a platform owner, I want measurable extraction quality so prompt/model changes can be evaluated safely.

## Technical Architecture
- Scoring service: map job brief requirements to extracted candidate profile fields and produce explainable dimension scores.
- Candidate workspace: add queryable list UI controls (status, skill, confidence threshold, sort mode).
- Metrics pipeline: persist extraction validation/repair outcomes and quality counters at candidate/job scope.
- Reliability: add retry state machine for `processing -> failed -> retrying -> profile_ready/failed` with bounded attempts.

```text
Candidate Intake Record
  |
  +--> Extraction (v9)
  |
  +--> Scoring Calibration (v10)
  |      +--> requirement fit dimensions
  |      +--> confidence-weighted total score
  |
  +--> Candidate Workspace (v10)
  |      +--> filter/sort/query by job
  |
  +--> Quality + Reliability (v10)
         +--> extraction metrics
         +--> bounded retries + failure reasons
```

### Data Flow
1. Employer opens job candidate workspace with filter/sort controls.
2. Candidate profile records are queried by owner + job scope with selected constraints.
3. Scoring service computes requirement-fit dimensions and aggregate candidate score.
4. UI renders ranked/filtered candidates and score evidence snippets.
5. Failed extraction records can be retried through bounded server action retries.
6. Quality metrics and retry outcomes are persisted for observability and follow-on evaluation.

## Out Of Scope
- Automated reject/advance decisions without human checkpoint.
- Interview-stage orchestration (Step 5+).
- Cross-company talent marketplace features.

## Dependencies
- v9 candidate intake/storage/extraction/persistence/action/route baseline.
- Existing employer job brief data model for requirement text.
- OpenAI extraction path and server-side prompt version contracts.

## Release Scope Boundary
v10 is the final sprint for Step 4 completion. Step 5 work (automated screening and evidence-based scoring interviews) begins only after v10 acceptance.

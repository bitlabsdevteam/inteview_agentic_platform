# Architecture Design: Employer AI Agentic Hiring Service

## Purpose
This document defines the end-to-end step-by-step architecture for building employer-side AI agentic hiring and recruiting features without relying on third-party human recruiting agents.

All product and engineering teams must implement employer hiring features against these steps, guardrails, and approval boundaries.

## Scope
- Employer module capabilities for hiring and recruiting automation.
- Agentic orchestration, decision support, and workflow execution.
- Human-in-the-loop controls for high-impact outcomes.
- Secure and auditable architecture using Postgres, Supabase, custom orchestration, OpenAI models, and Next.js.

## Step-by-Step Architecture

### Step 1: Role Intake and Requirement Discovery
Goal: Convert employer hiring intent into structured role requirements.

Capabilities:
- Guided intake flow for title, team, level, location, budget, must-have skills, and preferred skills.
- Clarification prompts for ambiguous or conflicting requirements.
- Automatic risk flags for unrealistic combinations (for example, junior budget + senior requirements).
- Structured role profile output persisted to Postgres.

System behavior:
- Employer submits role intake input.
- Orchestrator validates payload and permissions.
- Prompt assembly pulls active system and intake prompt versions.
- Model generates normalized role draft and clarification questions.
- Service stores all drafts, metadata, and trace ids.

### Step 2: Job Description Drafting and Quality Controls
Goal: Produce high-quality, bias-checked, publication-ready job descriptions.

Capabilities:
- JD generation from structured role profile.
- Readability and completeness checks.
- Bias and discriminatory language detection.
- Regeneration with targeted constraints (tone, seniority, market).

System behavior:
- Draft pipeline calls generation and policy-evaluation passes.
- Violations trigger deterministic rewrite requests.
- Final draft requires explicit employer approval.
- Prompt version and output checksum logged for audit.

### Step 3: Multi-Channel Job Publishing with Approval Gates
Goal: Publish approved roles consistently across channels.

Capabilities:
- Channel-specific formatting for careers page, LinkedIn-like channels, job boards, and referral copy.
- Publishing workflow status tracking.
- Retry handling and failure alerting.

System behavior:
- No channel publish action executes without `approved_for_publish=true`.
- Tool calls are schema-validated before execution.
- External publish responses stored with timestamp and actor context.
- Employer dashboard shows channel status and remediation actions.

### Step 4: Candidate Intake and Profile Structuring
Goal: Convert candidate submissions into searchable structured profiles.

Capabilities:
- Resume parsing, portfolio extraction, and skills normalization.
- Candidate profile scoring by hard requirements match.
- Data minimization and PII control in model context.

System behavior:
- Candidate documents are ingested via Supabase storage.
- Extraction tasks run through isolated parsing prompts.
- Structured candidate record persisted with confidence fields.
- Sensitive raw text stays access-controlled and is not over-shared.

### Step 5: Automated Screening and Evidence-Based Scoring
Goal: Run consistent first-round screening without manual recruiter dependency.

Capabilities:
- Role-specific asynchronous screening Q&A.
- Rubric-based scoring for technical and behavioral signals.
- Evidence snippets attached to each score dimension.
- Uncertainty flags when confidence is low.

System behavior:
- Screening workflow enforces question bank constraints by role.
- Model outputs must satisfy strict JSON schema.
- Failed schema validation triggers repair/retry path.
- No automatic final rejection without human checkpoint.

### Step 6: Interview Planning and Interviewer Enablement
Goal: Improve interview quality and consistency across panel members.

Capabilities:
- Interview plan generation by stage.
- Stage-specific question sets with follow-up prompts.
- Structured scorecards aligned to role rubric.

System behavior:
- Orchestrator maps candidate risk/strength signals to interview focus areas.
- Interview kits are generated as versioned artifacts.
- Interviewer feedback is captured in normalized schema for comparison.

### Step 7: Candidate Communication and Scheduling Automation
Goal: Reduce manual coordination overhead while preserving employer control.

Capabilities:
- Drafted outreach, reminders, and status updates.
- Calendar-based scheduling automation with conflict checks.
- FAQ handling with escalation for non-standard requests.

System behavior:
- Communication templates are generated server-side only.
- Sensitive messages (offer/rejection final wording) require human review mode.
- Every outbound message includes audit actor and template version metadata.

### Step 8: Decision Support, Calibration, and Hiring Recommendations
Goal: Support better final decisions using structured evidence.

Capabilities:
- Consolidated candidate comparison views.
- Interviewer score variance and disagreement detection.
- Recommendation states: `advance`, `hold`, `reject`, `collect_more_signal`.

System behavior:
- Decision summaries include evidence references, not hidden reasoning.
- Recommendations are advisory; final decision remains human-owned.
- Missing-signal detection blocks premature irreversible actions.

### Step 9: Compliance, Fairness, and Auditability Layer
Goal: Ensure hiring flows are defensible, compliant, and reviewable.

Capabilities:
- End-to-end audit logs for prompt version, tools used, records touched, and output ids.
- Policy checks for protected-attribute leakage and harmful content.
- Role-based access controls across employer, interviewer, candidate, and admin personas.

System behavior:
- Supabase RLS enforced on all user-scoped hiring tables.
- Operational logs redact secrets and sensitive PII by default.
- Policy violations trigger fallback templates and manual review queue.

### Step 10: Learning Loop and Continuous Improvement
Goal: Improve hiring quality over time using measurable outcomes.

Capabilities:
- Outcome tracking for pipeline conversion and quality-of-hire proxies.
- Rubric quality evaluation and question effectiveness scoring.
- Controlled prompt/version experiments with rollback.

System behavior:
- Post-hire analytics stored in aggregate form.
- Evaluation jobs compare recommendation quality against outcomes.
- Only approved prompt versions can be promoted to production.

## Required System Components

### 1) Employer App Surface (Next.js)
- Role intake UI.
- Job draft/publish workspace.
- Candidate pipeline and decision workspace.
- Interview planning workspace.

### 2) Agent Orchestration Service (Custom)
- Workflow engine for multi-step tasks.
- Prompt assembly layer (versioned components).
- Tool router with strict schema validation.
- Retry, fallback, and policy interruption handling.

### 3) Data Layer (Postgres via Supabase)
Minimum logical entities:
- roles
- role_versions
- candidates
- candidate_profiles
- screening_sessions
- interview_kits
- interview_feedback
- hiring_recommendations
- agent_prompt_versions
- agent_execution_audit

### 4) Model Layer (OpenAI)
- Generation models for drafting and communication.
- Reasoning models for evaluation and comparison.
- Structured extraction models for resume/profile parsing.
- Policy-evaluation models for safety and fairness checks.

### 5) Security and Access Layer
- Supabase Auth for user identity.
- RLS and server-side authorization for all protected operations.
- Service-role key only in secure backend runtime.

## Cross-Cutting Non-Functional Requirements
- Human approval required for publishing, final rejection rationale, and offer-stage communications.
- Prompt and policy configuration stored server-side only.
- Deterministic schema validation for all tool inputs and model outputs.
- Full auditability without exposing secrets or internal prompts.
- Prompt injection resistance in all retrieval and generation flows.
- Graceful fallback behavior for malformed model outputs and tool failures.

## Feature Implementation Rule
Any new employer hiring or recruiting feature must:
- Map to one or more steps in this document.
- Reuse the architecture layers and guardrails defined here.
- Include tests for authorization, policy compliance, and failure handling.
- Declare required human checkpoints before release.

If a feature cannot be mapped to these steps, the architecture document must be updated first and reviewed before implementation.

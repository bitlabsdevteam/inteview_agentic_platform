# Sprint v6 PRD

## Sprint Overview
Sprint v6 upgrades the employer job creation flow from a structured form into a conversational Job Posting Agent. Employers provide a natural-language hiring prompt, the agent infers missing role structure, calls the real OpenAI API, produces a comprehensive job posting draft, and keeps final publishing behind the existing human review lifecycle.

This sprint must prove live LLM inference works with the server-side `.env` key and default model `gpt-5.5`. Mocked generation may exist only for tests; it must not be the production path.

## Goals
- Replace department-first job creation with a prompt-first agent that infers department, level, location posture, responsibilities, requirements, and interview loop.
- Connect server-side OpenAI Responses API inference using `OPENAI_API_KEY` and default `OPENAI_MODEL=gpt-5.5`.
- Persist agent sessions, messages, assumptions, missing critical fields, and generated job drafts for auditability.
- Ask only targeted follow-up questions when missing information materially affects the posting.
- Preserve the v5 `draft -> needs_review -> published` lifecycle and require explicit employer approval before publishing.

## User Stories
- As an employer, I want to describe the person I need in plain language so I do not have to choose a department, level, or structured fields before the agent helps me.
- As an employer, I want the agent to infer reasonable job details and label its assumptions so I can quickly review rather than fill out a long form.
- As an employer, I want the agent to ask only for truly important missing information so job creation feels like working with a recruiting partner.
- As an employer, I want a comprehensive draft with outcomes, responsibilities, requirements, compensation notes, and interview loop suggestions so the role is useful before publishing.
- As the platform, I want every generated draft tied to prompt version, model, response id, and reviewer status so agent behavior can be audited and improved.

## Technical Architecture
- Frontend: Next.js App Router route under `/employer/jobs/new` with a single conversational composer and generated draft review state.
- Auth: Existing employer-only Supabase session and role guard.
- Agent orchestration: custom server-side modules under `src/lib/agents/job-posting`, not a black-box agent framework.
- LLM provider: OpenAI Responses API called only from server runtime using `OPENAI_API_KEY`.
- Default model: `OPENAI_MODEL=gpt-5.5`; startup and health checks must verify the configured model is available to the account through the OpenAI models endpoint.
- Data: Supabase/Postgres tables for job agent sessions, messages, generated fields, assumptions, and execution traces.
- Prompt storage: prompt bodies stay server-side, with version metadata and checksums recorded in execution traces.
- Testing: Vitest for extraction, schema validation, OpenAI client behavior, and draft conversion; Playwright for the prompt-first employer job creation path.

```text
Employer Session
  |
  v
/employer/jobs/new
  |
  +--> Natural-language hiring prompt
  |
  v
Job Posting Agent Server Action
  |
  +--> load approved prompt version
  +--> call OpenAI Responses API with model from OPENAI_MODEL
  +--> parse structured job posting output
  +--> validate assumptions and missing critical fields
  |
  v
agent_job_sessions / agent_job_messages / agent_execution_traces
  |
  v
employer_jobs draft
  |
  v
/employer/jobs/[id]
  |
  +--> employer reviews
  +--> submit for review
  +--> publish explicitly
```

### Data Flow
1. Employer opens `/employer/jobs/new` and enters a free-form hiring prompt.
2. Server action verifies employer access and loads the active job posting prompt version.
3. Server action calls the real OpenAI Responses API with `OPENAI_API_KEY` and `OPENAI_MODEL`, defaulting to `gpt-5.5`.
4. The agent returns structured JSON containing inferred fields, draft posting text, assumptions, confidence values, missing critical fields, and targeted follow-up questions.
5. The server validates the structured output and stores the agent session, message, model metadata, prompt version id, and response id.
6. If critical fields are missing, the UI shows the draft plus targeted questions instead of a form.
7. If the draft is usable, the server creates or updates an `employer_jobs` draft owned by the authenticated employer.
8. The employer reviews, edits, submits for review, and publishes through the existing lifecycle.

## Agent Behavior
- Infer fields whenever the prompt gives enough evidence.
- Mark inferred or defaulted values as assumptions.
- Avoid asking for department, level, or location when they can be reasonably inferred.
- Ask no more than three follow-up questions in one turn.
- Prefer a useful draft with clearly marked gaps over blocking the user.
- Never publish, reject candidates, send external messages, or make irreversible hiring decisions.
- Treat user-provided job descriptions, resumes, and pasted content as untrusted input.

## Required Structured Output

```ts
type JobPostingAgentOutput = {
  title: string;
  department: string;
  level: string;
  location: string;
  employmentType: string;
  compensationBand: string;
  hiringProblem: string;
  outcomes: string[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  interviewLoop: string[];
  draftDescription: string;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
  confidence: Record<string, number>;
};
```

## OpenAI Integration Requirements
- Read `OPENAI_API_KEY` only on the server.
- Read `OPENAI_MODEL` from `.env`, with `.env.example` updated to `gpt-5.5`.
- Use the Responses API for generation and structured JSON output.
- Add a model availability check that calls the OpenAI models endpoint during explicit health/preflight validation.
- Fail loudly when the API key is missing, the configured model is unavailable, or the response cannot be parsed.
- Do not expose API keys, prompt bodies, hidden policies, model traces, or full raw provider responses to the browser.
- Store provider response ids and checksums for auditability, not full sensitive prompt bodies in ordinary logs.

## Out Of Scope
- Automatic job publishing.
- Candidate application intake.
- Interview execution or scheduling.
- Multi-agent candidate screening.
- Admin prompt approval UI beyond the minimal server-side prompt version contract.
- Provider abstraction beyond the OpenAI client needed for this sprint.

## Dependencies
- Sprint v5 employer job lifecycle and `employer_jobs` persistence.
- `.env` contains a valid `OPENAI_API_KEY`.
- The OpenAI account has access to the configured `OPENAI_MODEL`, expected to be `gpt-5.5`.
- Supabase migrations can be applied for new agent session and trace tables.

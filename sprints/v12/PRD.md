# Sprint v12 PRD

## Sprint Overview
Sprint v12 upgrades employer job drafting into a persistent job-scoped chat workflow with memory, compaction, and scoped retrieval. Employers can keep chatting with the JD agent on each job detail page to iteratively improve the same draft until it is ready for review and explicit publish approval.

This sprint extends `Architecture_Design.md` Step 2 (JD drafting quality controls) with durable session memory and retrieval discipline, while preserving existing approval gates from Step 3.

## Goals
- Keep a persistent JD chat UI on `/employer/jobs/[id]` for continuous draft refinement.
- Add job/session-scoped memory storage for reusable constraints, decisions, unresolved gaps, and readiness context.
- Add deterministic memory compaction to keep long conversations prompt-efficient without losing key hiring decisions.
- Add scoped RAG retrieval for each chat turn using employer/job/session boundaries.
- Keep publish human-controlled (`draft -> needs_review -> published`) with explicit employer action only.

## User Stories
- As an employer, I want to keep chatting with the same agent for one job so the JD improves iteratively.
- As an employer, I want the agent to remember prior decisions and unresolved gaps without repeating context every turn.
- As an employer, I want a clear readiness view and targeted follow-up questions so I know what still blocks publishing.
- As a platform owner, I want memory and retrieval scoped to the authenticated employer and job so data boundaries remain safe.

## Technical Architecture
- Frontend: add a persistent JD chat panel on `/employer/jobs/[id]` using a dedicated client component.
- API: add `POST /api/employer/jobs/[id]/agent-chat` for job-scoped iterative revisions.
- Agent orchestration: extend job-posting follow-up flow to support generic chat turns and draft updates.
- Memory layer:
  - `agent_memory_items` for durable facts and readiness state.
  - `agent_memory_summaries` for compacted session context.
- Retrieval: lexical overlap + importance + recency ranking within strict employer/job/session scope.
- Persistence and security: Supabase/Postgres with owner-scoped RLS and audit traces.

```text
Employer job detail chat
  |
  v
POST /api/employer/jobs/[id]/agent-chat
  |
  +--> auth + owner check
  +--> load/create session
  +--> retrieve scoped memory + summary
  +--> assemble prompt with current draft + memory context
  +--> run structured inference
  +--> update same employer job draft
  +--> append chat messages + execution trace
  +--> upsert memory summary + append memory items
  |
  v
updated chat + readiness + memory state in UI
```

## Out Of Scope
- Autonomous publish actions.
- Cross-employer shared memory.
- Candidate-facing JD editing tools.
- Vector embedding infra and ANN index tuning (can be added later without changing API contracts).

## Dependencies
- Existing v6-v11 employer auth, job lifecycle, and job-posting inference modules.
- Supabase migration workflow and RLS conventions.
- Existing prompt guardrails and structured output validation.

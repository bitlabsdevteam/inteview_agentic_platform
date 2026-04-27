# Sprint v7 PRD

## Sprint Overview
Sprint v7 introduces transparent agent execution for employer job creation: employers can see concise reasoning summaries, live thinking-message stream chunks, and action logs while the job creator agent works. It also adds a first-class skills-and-tools capability layer so the agent can use approved reusable skills and a Perplexity-backed web search tool from server runtime.

This sprint keeps hidden policies and chain-of-thought protected while increasing user-visible transparency through safe summaries and deterministic action traces.

## Goals
- Add user-visible agent transparency fields (`reasoningSummary`, `thinkingMessages`, `actionLog`) to the job creation flow.
- Add capability registration so the job creator agent can consume declared skills and tools.
- Add `tools/web_search_tool.ts` backed by Perplexity API using server-side environment keys.
- Add a reusable skill template in `skills/` that documents how the agent should apply skills and tools.
- Preserve existing publishing guardrails and human approval requirements.

## User Stories
- As an employer, I want to see how the agent is progressing so job creation feels trustworthy and inspectable.
- As an employer, I want concise reasoning summaries instead of opaque draft generation.
- As a platform owner, I want the job creator agent to use only approved skills and tools with clear auditability.
- As a platform owner, I want external search capability to stay server-side and key-protected.

## Technical Architecture
- Frontend: employer job detail surface shows transparency panels for reasoning summaries, thinking-message stream chunks, and action logs.
- Agent orchestration: prompt assembly injects a capability catalog describing approved skills and tools.
- Skills: template skill contract under `skills/job-creator-template/SKILL.md`.
- Tools: server-side Perplexity integration at `tools/web_search_tool.ts`.
- Output contract: structured output includes transparency fields in addition to draft content and follow-up fields.
- Security: no raw chain-of-thought, no secrets in UI, no prompt body leakage.

```text
Employer Prompt
  |
  v
Job Creator Agent Orchestration
  |
  +--> Prompt assembly
  |      +--> system prompt
  |      +--> product rules
  |      +--> capability catalog (skills + tools)
  |
  +--> LLM structured output
  |      +--> job draft fields
  |      +--> reasoningSummary
  |      +--> thinkingMessages
  |      +--> actionLog
  |
  +--> Optional tool call
  |      +--> web_search_tool (Perplexity API)
  |
  v
Session + Trace Persistence
  |
  v
Employer Job Detail Transparency Panels
```

### Data Flow
1. Employer submits a prompt from `/employer/jobs/new`.
2. Server assembles prompt layers and appends capability catalog instructions.
3. Model returns structured draft + transparency fields.
4. Server persists draft, session metadata, and execution trace.
5. Job detail page loads latest session and renders transparency fields.
6. Employer reviews draft and continues existing review/publish lifecycle.

## Out Of Scope
- Exposing full hidden chain-of-thought.
- Client-side direct calls to Perplexity API.
- Autonomous publishing without employer review.
- Multi-tool planning across multiple external providers.

## Dependencies
- Sprint v6 prompt-first creation flow and agent persistence tables.
- Server runtime environment includes `PERPLEXITY_API_KEY`.
- Existing OpenAI integration remains the primary generation backend.

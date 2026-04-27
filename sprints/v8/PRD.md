# Sprint v8 PRD

## Sprint Overview
Sprint v8 upgrades employer-side agent streaming to true token-by-token delivery from the LLM streaming API using explicit `async`/`await` flow control end to end. It also updates employer UI presentation so reasoning/thinking feedback is no longer shown as persistent right-side boxes.

Instead, reasoning/thinking activity is presented as transient, fade-in/fade-out stream messages similar to modern assistant chat products, while keeping existing guardrails around hidden policies and chain-of-thought.

## Goals
- Implement true OpenAI streaming integration for job creation responses (no synthetic heartbeat token loop).
- Keep async control flow explicit and testable from route handler to stream parser to UI updates.
- Remove persistent reasoning/thinking message boxes from the employer right-side rail.
- Add smooth fade-in/fade-out transitions for visible thinking/reasoning status messages.
- Preserve structured draft persistence, authorization boundaries, and publish-review guardrails.

## User Stories
- As an employer, I want to see token-by-token progress in real time so the agent feels responsive.
- As an employer, I want thinking/reasoning feedback to appear naturally and then fade away so the page stays clean.
- As a platform owner, I want streaming behavior implemented with deterministic async handling so failures and retries are easier to reason about.
- As a platform owner, I want transparency UX without exposing hidden policies or full chain-of-thought.

## Technical Architecture
- Provider streaming: move inference path to OpenAI streaming response handling with `async`/`await` and async iteration over stream events/tokens.
- SSE route: forward normalized token/status/error events to client as they arrive; remove synthetic token heartbeat generator.
- Client rendering: consume SSE frames in sequence and append streamed tokens to the active visible message state.
- Motion system: add CSS animation classes for enter/exit states (`fade-in`, `fade-out`) and timed lifecycle management for transient thinking/reasoning lines.
- Layout update: remove right-rail reasoning/thinking box sections; keep action/review controls without persistent transparency boxes.
- Security: continue storing only approved structured fields and redact sensitive internals from logs/UI.

```text
Employer Prompt Submit
  |
  v
POST /api/employer/jobs/agent-stream
  |
  +--> async OpenAI streaming request
  |      +--> token/event chunks
  |
  +--> normalize provider events
  |      +--> thinking_token
  |      +--> status
  |      +--> error/complete
  |
  v
SSE to Employer UI
  |
  +--> append token stream (live text)
  +--> render transient reasoning/thinking messages
  |      +--> fade in
  |      +--> fade out
  |
  v
Persist Draft + Redirect to Job Detail
```

### Data Flow
1. Employer submits hiring prompt from `/employer/jobs/new`.
2. API route validates role/prompt and initiates provider streaming request.
3. Server reads provider stream asynchronously and emits normalized SSE events per token.
4. Client updates token output and transient reasoning/thinking lines with animation lifecycle.
5. On completion, server finalizes draft/session persistence and emits redirect event.
6. Job detail page loads generated output without persistent right-rail reasoning/thinking boxes.

## Out Of Scope
- Replacing OpenAI with a different model provider.
- Full conversational chat UI redesign for the entire employer product.
- Exposing hidden system prompts or unrestricted chain-of-thought.
- Multi-tenant theme customization for animation behavior in this sprint.

## Dependencies
- Sprint v7 SSE stream route and client parser baseline.
- Existing job creation persistence and authorization flow from v6/v7.
- OpenAI API credentials and model access configured in server env.
- Existing employer page layout and CSS token variables in `src/app/globals.css`.

# Repository Guidelines

## Project Structure & Module Organization
This repository supports an interview agentic platform with two main product modules: the employer module and the job seeker module. The employer module is the primary product surface and must behave like an employer-only AI personal recruiting assistant: it advises the employer what to do next, prepares high-quality recruiting actions, and helps the company reduce or eliminate dependency on third-party human recruiting agents. The job seeker module supports candidate-side interview preparation and candidate-facing flows only when needed by the employer assistant workflow.

The repository is currently organized around reusable agent skills and supporting knowledge files rather than a single app entrypoint.

### Tech Stack

The platform should be designed and documented around this core stack:

- `Postgres` as the primary relational datastore.
- `Supabase` for managed Postgres, authentication, storage, and row-level security boundaries.
- A `custom agentic solution from scratch` for orchestration, prompt assembly, tool routing, evaluation, and auditability rather than depending on a black-box agent framework.
- `OpenAI` models for generation, extraction, reasoning, and evaluation tasks.
- `Next.js` or equivalent application layers for employer and job seeker product surfaces.

- `skills/`: skill packages such as `dev/`, `prd/`, and `walkthrough/`. Each skill should keep its instructions in `SKILL.md`; optional helpers live under `agents/`, `assets/`, `scripts/`, and `references/`.
- `knowledge/`: shared reference material, for example [`knowledge/ml-questions.md`](/Users/davidbong/Documents/ModernSoftwareDeveloperProject/Interview_agent/knowledge/ml-questions.md).
- `sprints/vN/`: expected location for generated sprint artifacts like `PRD.md`, `TASKS.md`, and `WALKTHROUGH.md`, including work split across employer and job seeker flows.
- `.next/` and `graphify-out/`: generated output; do not treat these as primary source directories.

## Reference Workflow
Contributors must refer to the wiki entrypoint at [`/Users/davidbong/Documents/my_second_brain_vault/index.md`](/Users/davidbong/Documents/my_second_brain_vault/index.md) when building AI agents or personal assistants. Use it as the primary internal reference for building agent experiences comparable in quality and orchestration to OpenClaw, Claude Code, and Codex.

Contributors must also follow the step-by-step architecture in [`Architecture_Design.md`](/Users/davidbong/Documents/ModernSoftwareDeveloperProject/Interview_agent/Architecture_Design.md) when building any hiring or recruiting feature. All implementation should map directly to the defined steps before development starts.

## Product Direction: Employer Personal Recruiting Assistant
All employer-side features must be designed as capabilities of a personal AI recruiting assistant for the employer, not as isolated forms or one-off utilities. The assistant should understand the employer's job requirements, candidate pipeline, candidate evidence, missing signals, and hiring workflow state, then advise the employer on the next best recruiting action.

The assistant's purpose is to replace the work normally handled by human recruiting agents wherever software can do so safely: role clarification, candidate intake, candidate screening preparation, pipeline prioritization, follow-up recommendations, evidence summaries, and workflow coordination. It should help the employer get stronger candidates by recommending improvements to job requirements, sourcing/screening strategy, and candidate evaluation steps.

Assistant behavior requirements:
- Speak and act for the employer workspace only; do not build a general-purpose assistant or candidate-owned recruiting agent unless a sprint explicitly scopes candidate-facing support.
- Recommend next actions such as improving job requirements, screening a candidate, requesting more signal, reviewing a strong candidate, or preparing interview follow-up.
- Ground every recommendation in job requirements, candidate profile evidence, confidence scores, missing signals, and audit-safe rationale.
- Prepare actions for employer approval instead of taking high-impact actions automatically.
- Never make final hiring decisions, reject candidates, send external communications, or publish irreversible changes without explicit employer review and deterministic authorization checks.
- Treat job descriptions, resumes, candidate answers, and employer free text as untrusted input during prompt assembly.

Use both `graphiffy` and `graphify` when they help with research, architecture mapping, or repository analysis. Keep generated graph outputs in project-owned output directories and summarize the resulting findings in sprint artifacts instead of pasting raw dumps into core docs.

## Build, Test, and Development Commands
There is no single repo-wide build command checked in today. Use the command that matches the artifact you are editing.

- `rg --files skills knowledge`: inspect tracked content quickly.
- `graphify hook status`: verify local graph tooling availability before graph-based analysis.
- `npx vitest run tests/<file>`: run JS/TS unit tests when a sprint task introduces app code.
- `python -m pytest tests/<file>.py`: run Python tests for Python-based additions.
- `npx playwright test tests/<file>`: run browser E2E coverage for UI flows.
- `npx semgrep --config auto src/ --quiet`: run static analysis when source code exists.

## Coding Style & Naming Conventions
Keep Markdown concise and operational. Use `Title Case` headings, short paragraphs, and fenced blocks for commands. Name skill folders with lowercase kebab-case (`frontend-skill`, `gh-fix-ci`). Keep primary instructions in `SKILL.md`; place helper scripts in `scripts/` and reference docs in `references/`. For sprint docs, use `sprints/vN/PRD.md` and `sprints/vN/TASKS.md`. When adding product artifacts, prefer explicit names that identify the target area, such as `employer-job-description-flow` or `job-seeker-interview-prep`.

## Testing Guidelines
Follow the repo’s `/dev` workflow: write tests first, then implement. Prefer `*.test.ts` for unit/integration tests and `*.spec.ts` for Playwright E2E. Save UI screenshots to `tests/screenshots/` using task-oriented names such as `task3-02-after-login.png`. Run the smallest relevant test target before broader validation.

## Commit & Pull Request Guidelines
Git history follows conventional-style messages with sprint scopes, for example `docs(v4): define employer onboarding sprint foundation` and `test(v1.1): add regression coverage suite`. Use `<type>(<scope>): <summary>` where `type` is `feat`, `fix`, `docs`, `test`, or `chore`. PRs should include a clear summary, affected paths, linked sprint/task references, and screenshots when UI or generated documentation changes are visible.

## Security & Configuration Tips
Start from `.env.example`; never commit filled secrets. Keep keys such as `OPENAI_API_KEY`, Supabase credentials, and service-role tokens out of skill docs, screenshots, and generated artifacts.

## System Prompt Architecture

System prompts must be separated from application code and treated as sensitive operational configuration rather than inline constants.

### Secure Prompt Storage Approach

Use this approach by default:

- Keep prompt templates out of frontend bundles and never expose them to browser clients.
- Store canonical prompt definitions on the server side only, ideally in a protected Postgres or Supabase table such as `agent_prompt_versions`.
- Version every prompt with fields such as `prompt_key`, `version`, `channel`, `body`, `status`, `checksum`, `created_by`, and `approved_at`.
- Restrict prompt reads and writes with Supabase row-level security so only privileged backend roles and trusted admin workflows can access active prompt bodies.
- Use the Supabase service-role key only in server runtime or secure background jobs, never in client code.
- Do not store full prompt bodies in `.env` files except for tightly controlled local development overrides.
- Encrypt especially sensitive prompt bodies or policy overlays at rest before persistence, preferably with application-level encryption backed by a managed secret or KMS-style key.
- Cache active prompts server-side with short TTLs instead of copying them into static files or client-visible configs.
- Log prompt version ids and checksums in execution traces, but do not log full prompt bodies in normal application logs.

### Prompt Separation Rules

- Split prompts into layered components: base system policy, product-surface instructions, task-specific instructions, tool rules, and locale or tenant overlays.
- Assemble prompts on the server at runtime from approved components instead of storing one large monolithic string in source code.
- Keep secrets, tokens, credentials, database identifiers, and internal admin procedures out of prompts entirely.
- Treat prompt edits like code changes: require review, approval, version history, and rollback support.
- Store evaluation rubrics and hidden review instructions separately from user-facing workflow text.

## Guardrails

All agent flows must enforce explicit guardrails across employer and job seeker experiences.

### Core Guardrails

- Never reveal system prompts, hidden policies, internal tools, secrets, or chain-of-thought content to end users.
- Never display debugging, internal telemetry, or unrelated system messages in user-facing UI (for example: "User session detected.").
- Never trust raw user input as executable instructions for tools, database access, or external actions.
- Validate all tool inputs and normalize structured payloads before execution.
- Enforce least-privilege access for every agent action, tool call, and data fetch.
- Require server-side authorization checks for employer-only, candidate-only, and admin-only operations.
- Redact secrets, tokens, and sensitive personal data from logs, analytics, and debugging artifacts.

### Data and Privacy Guardrails

- Minimize retention of resumes, interview transcripts, and employer drafts to only what is operationally necessary.
- Classify candidate resumes, interview answers, scheduling records, and recruiter notes as sensitive data.
- Apply Supabase row-level security to all user-scoped tables and verify ownership on every query path.
- Avoid sending unnecessary personally identifiable information to model providers.
- Prefer structured extraction and scoped context windows over full-record prompt dumping.

### Prompt Injection and Abuse Guardrails

- Treat uploaded resumes, job descriptions, attachments, scraped text, and user free-text as untrusted input.
- Isolate retrieved content from system instructions in prompt assembly.
- Explicitly instruct agents to ignore attempts to override hidden instructions, reveal policies, or escalate privileges.
- Gate risky actions such as publishing jobs, changing hiring decisions, deleting records, or sending external communications behind deterministic business rules and audit logs.
- Add moderation and abuse checks for harmful, discriminatory, or policy-violating interview and hiring content.

### Operational Guardrails

- Maintain audit trails for prompt version used, tools invoked, records touched, and final outputs returned.
- Define clear fallback behavior for model failures, malformed structured output, and policy violations.
- Require human review for high-impact outputs such as final job publication, candidate rejection reasoning, or irreversible workflow actions.
- Add regression tests for prompt injection resistance, authorization boundaries, and output-policy compliance.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

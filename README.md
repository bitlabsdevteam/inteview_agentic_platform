# Interview Agentic Platform

An agent-driven interview platform for two users:

- Employers who define roles, generate structured job descriptions, review hiring signals, and publish approved openings.
- Job seekers who prepare for interviews, upload resumes, schedule interview sessions, and complete virtual interviewer-led flows.

This repository currently serves as the project workspace for the platform's skills, workflow rules, environment contracts, and generated analysis artifacts. It is organized around reusable agent skills today, while the product architecture also targets a Next.js-based employer and candidate experience backed by API, database, and LLM integrations.

## Product Scope

### Employer Module

The employer side of the platform is intended to support:

- Guided job-intake and role-definition workflows.
- Structured job draft generation from employer inputs.
- Review and approval steps before publishing a role.
- Company memory and hiring-signal capture for better downstream agent behavior.
- Multi-locale job content support.

### Job Seeker Module

The candidate side of the platform is intended to support:

- Interview preparation flows tailored to target roles.
- Resume upload and extraction.
- Interview scheduling and session reservation.
- Virtual interview sessions led by an AI interviewer.
- Speech generation for interviewer responses through ElevenLabs integration.

## Current Repository State

The checked-in repository is currently centered on reusable skills and project documentation rather than a complete source tree. You will find:

- Skill packages under `skills/` for sprint planning, implementation, walkthrough generation, documentation, Playwright usage, and security guidance.
- Repository-level operating instructions in `AGENTS.md`.
- Environment variable contracts in `.env.example`.
- Generated artifacts under `.next/` and `graphify-out/`, which are useful for local context but should not be treated as primary source directories.

The generated graph report indicates the broader product architecture includes employer onboarding, job posting flows, candidate scheduling, resume handling, and interview-session logic. If the app source is added or restored later, this README already reflects the intended platform boundaries.

## Repository Layout

```text
.
├── AGENTS.md
├── README.md
├── .env.example
├── skills/
│   ├── dev/
│   ├── doc/
│   ├── frontend-skill/
│   ├── gh-fix-ci/
│   ├── playwright/
│   ├── prd/
│   ├── security-best-practices/
│   └── walkthrough/
├── graphify-out/
└── .next/
```

### Important Directories

- `skills/`: reusable agent skills. Each skill should keep its primary instructions in `SKILL.md` and may also include `agents/`, `assets/`, `scripts/`, and `references/`.
- `knowledge/`: expected location for shared project reference material.
- `sprints/vN/`: expected location for sprint artifacts such as `PRD.md`, `TASKS.md`, and `WALKTHROUGH.md`.
- `.next/`: generated Next.js output.
- `graphify-out/`: generated graph-analysis output.

## Technology Direction

Based on the current workspace contracts and generated artifacts, the platform is designed around:

- Next.js for the web application layer.
- Supabase for authentication and data access.
- OpenAI models for generation, extraction, and agent behavior.
- ElevenLabs for interviewer speech output.
- Graph-based repository analysis through `graphify`.

## Environment Setup

Start from `.env.example`:

```bash
cp .env.example .env
```

Key environment groups already defined in the repo:

- Application ports for frontend, backend, and Postgres.
- Database connection settings.
- OpenAI configuration.
- Supabase public and service-role keys.
- ElevenLabs voice and relay settings.
- Demo employer-auth flags for local development.

Never commit populated secrets. Keep local keys in `.env` or environment-specific overrides that are already ignored by Git.

## Development Workflow

This repository follows a skill-first workflow.

### Common Tasks

- Inspect repository content:

```bash
rg --files skills knowledge
```

- Check local graph tooling:

```bash
graphify hook status
```

- Run JavaScript or TypeScript tests:

```bash
npx vitest run tests/<file>
```

- Run Python tests:

```bash
python -m pytest tests/<file>.py
```

- Run Playwright E2E tests:

```bash
npx playwright test tests/<file>
```

- Run static analysis when app source exists:

```bash
npx semgrep --config auto src/ --quiet
```

### Working Model

1. Use `prd` to define sprint scope and generate planning artifacts.
2. Use `dev` to implement one atomic task at a time with tests first.
3. Use `walkthrough` to generate a delivery summary after implementation.

## Coding and Documentation Conventions

- Keep Markdown concise, operational, and in `Title Case`.
- Use lowercase kebab-case for skill folder names.
- Keep skill instructions in `SKILL.md`.
- Put helper scripts in `scripts/`.
- Put reference material in `references/`.
- Use explicit artifact names that identify the target domain, such as `employer-job-description-flow` or `job-seeker-interview-prep`.

## Testing Expectations

- Follow test-first development for new implementation work.
- Use `*.test.ts` for unit and integration coverage.
- Use `*.spec.ts` for Playwright end-to-end coverage.
- Save UI screenshots under `tests/screenshots/` with task-oriented filenames.
- Prefer the smallest relevant test target before running broader suites.

## Internal Reference Workflow

When designing advanced agent behavior, contributors should use the internal wiki at:

`/Users/davidbong/Documents/my_second_brain_vault`

Use it as the primary internal reference for agent orchestration quality and workflow design. When repository analysis is useful, use `graphiffy` and `graphify`, keep generated outputs in project-owned output directories, and summarize findings in sprint artifacts instead of copying raw graph dumps into core documentation.

## Git and Contribution Guidelines

Use conventional commit messages:

```text
<type>(<scope>): <summary>
```

Supported commit types:

- `feat`
- `fix`
- `docs`
- `test`
- `chore`

Examples:

- `docs(v4): define employer onboarding sprint foundation`
- `test(v1.1): add regression coverage suite`

Pull requests should include:

- A short summary of the change.
- Affected paths.
- Linked sprint or task references.
- Screenshots when the change affects visible UI or generated docs.

## Security Notes

- Do not commit real credentials.
- Do not place secrets in skill docs, screenshots, or generated artifacts.
- Keep `OPENAI_API_KEY`, Supabase keys, and service-role tokens out of source control.

## Status

This repository is a strong foundation for an interview agentic platform, but the currently visible source tree is documentation- and skill-heavy. As the application source is added or restored, this README can be extended with concrete run commands for the web app, API, database migrations, and deployment workflows.

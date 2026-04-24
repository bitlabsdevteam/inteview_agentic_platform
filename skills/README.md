# Local Skills

This project keeps custom Codex/Claude-style skills in `skills/`.

Available skills:
- `prd`: Brainstorm a sprint and generate `PRD.md` plus `TASKS.md`.
- `dev`: Implement exactly one backlog task with TDD, security checks, and task updates.
- `walkthrough`: Generate a sprint walkthrough report from completed work.

Recommended layout:

```text
skills/
  prd/
    SKILL.md
  dev/
    SKILL.md
  walkthrough/
    SKILL.md
```

These skills assume sprint artifacts live under `sprints/vN/`.

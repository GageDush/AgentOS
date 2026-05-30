# Codex Repair Prompt

Use this if Codex creates a repo but it does not run.

```md
Read the current repo and `AGENTOS_MASTER_CODEX_PROMPT.md`.

Fix the project until these commands pass:

pnpm install
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test

Do not add new features. Only fix build, dependency, TypeScript, config, Docker, Phaser, API, worker, gateway, and sanitization errors.

Run the commands you can run.
Report exact errors that remain.
Do not claim a command passed unless you actually ran it and saw it pass.
```

Run it with:

```powershell
codex exec --sandbox workspace-write (Get-Content .\CODEX_REPAIR_PROMPT.md -Raw)
```

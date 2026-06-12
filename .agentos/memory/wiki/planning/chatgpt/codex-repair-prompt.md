---
slug: planning/chatgpt/codex-repair-prompt
title: Codex Repair Prompt
tags: [chatgpt, planning, og-board, bundle-git]
valid_from: 2026-06-12
---
# Codex Repair Prompt
OG AgentOS planning material from the ChatGPT project board.
## Metadata
- Source path: `AgentOS_Project_Bundle/CODEX_REPAIR_PROMPT.md`
- Source kind: bundle-git
- ChatGPT project: [AgentOS planning board](https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project)
- Updated: 2026-06-12T13:48:22.906Z
## Outline

- Codex Repair Prompt
## Content
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


_(truncated for wiki; full text kept in import source.)_
## Related
- [[planning/chatgpt/index]]
- [[planning/chatgpt/agentos-project]]
- [[index]]
# Project wave runner (P1–P10)

Runs AgentOS scoping projects **in order** with chained Cursor prompts.

## Interactive mode (Cursor chat)

```powershell
# 1. Kick off P1 (copies prompt to clipboard)
pnpm project:wave

# 2. Paste in Cursor chat — wait for agent to finish

# 3. Advance to next project (copies chain prompt)
pnpm project:wave:next

# Repeat step 2–3 until P10 complete
```

**Chain prompt format** (P2 onward):

```text
Great, Start P2 and give me a summary of what was done and what wasn't done
```

**P1 kickoff** is a full prompt referencing `docs/demo/SCOPING_RESPONSE.md` 10-step plan.

### Other commands

| Command | Action |
|---------|--------|
| `pnpm project:wave:status` | Show progress |
| `pnpm project:wave:prompt` | Reprint current prompt |
| `pnpm project:wave:reset` | Start over |
| `pnpm project:wave:list` | List P1–P10 |

State file: `.agentos/state/project-wave-state.json`

## Automated mode (Cursor SDK)

Requires `CURSOR_API_KEY` in `.env`:

```powershell
pnpm project:wave:run
```

Runs P1→P10 via `@cursor/sdk` `Agent.prompt` without manual paste.

## Projects

| ID | Title |
|----|-------|
| P1 | Implementer realism |
| P2 | Quality gates |
| P3 | Release execution |
| P4 | Live dev UX |
| P5 | Discord test parity + CI |
| P6 | Hosted scale |
| P7 | Memory curator |
| P8 | Ship |
| P9 | App intake polish |
| P10 | Integration & V1 readiness |

Manifest: `scripts/project-wave.manifest.json`

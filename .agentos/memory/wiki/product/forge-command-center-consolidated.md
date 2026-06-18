---
slug: product/forge-command-center-consolidated
title: Forge Command Center — Consolidated Conversation Brief
tags: [product, forge, dashboard, consolidated, cursor-session]
valid_from: 2026-06-12
source_sessions:
  - sessions/cursor/49de712f-f8ab-41ac-af48-5827eb232388
---
# Forge Command Center — Consolidated Brief

Single reference merging the Forge UI/UX, dashboard, auth, URLs, agent roster, and art-asset conversations from Cursor session `49de712f`. Use this instead of replaying long chat history.

## Product snapshot

**AgentOS Command Center** is a local-first mission console: dispatch work, approve sandbox actions, watch runs, and chat with the crew. Visual language: **AgentOS Forge** — warm-dark depth, molten-orange accent (`#FF6A35`), mono labels, cursor-reactive motion.

- **Canonical app URL:** https://flous.dev (also `app.flous.dev`, `agentos.flous.dev`)
- **API:** https://api.flous.dev (browser uses same-origin `/agentos-api/*` proxy)
- **Local dev:** UI `:3000`, API `:8787`, gateway `:8790`

## What ships today (Forge dashboard)

### Routes

| Path | Purpose |
|------|---------|
| `/`, `/dashboard` | Mission control + entry experience (boot → Run Everything → dashboard) |
| `/missions` | Compose & run missions |
| `/control-gate` | Sandbox approvals |
| `/blackbox` | Logs + audit |
| `/operators`, `/routines`, `/loadout`, `/archive`, `/settings` | Overflow nav |
| `/preview/forge` | Dev component gallery |

### Dashboard layout

1. **Metric strip** — compact chips → missions, approvals, archive, sessions
2. **Mission hero** — `MissionControlPanel` + command deck + activity feed
3. **Agent presence strip** — 56px orbs, state rings, pixel avatars
4. **Mission timeline** — horizontal stepper with step detail on click
5. **Collapsed run inspector** — expand for full detail on other sections

**Removed by design:** quick-actions rail on dashboard, generated app preview until real preview URL exists.

### Global chrome

- Slim top nav (scroll hide/show; health merges into nav when scrolled)
- Command palette `⌘K` / `Ctrl+K`
- Chat dock FAB bottom-right (`Ctrl+/` / `⌘/`)
- Discord OAuth; session cookie `agentos_session` on `.flous.dev` (365-day sliding refresh)

### Entry flow

First visit per tab: Boot (~2.4s) → Landing (`> Run Everything`) → Launch → dashboard. Skip via `sessionStorage.agentos-forge-entered = "1"`.

## URLs & tunnel (quick reference)

| Public | Local target |
|--------|--------------|
| `flous.dev` → dashboard | `127.0.0.1:3000` |
| `api.flous.dev` → API | `127.0.0.1:8787` |
| `/agentos-api/*` on app origin | proxies to API |

OAuth: `https://api.flous.dev/auth/discord` → callback → redirect `https://flous.dev`.

See [[docs/troubleshooting]] for 525/530 tunnel fixes.

## Agent crew — names & placards

Format: **`[Role] Name`**. All 21 pipeline agents + operator alias.

| Agent ID | Placard | Accent |
|----------|---------|--------|
| `admin-agent` | [Admin] Ash | `#f1c40f` |
| `task-classifier` | [Classifier] Clemont | `#f39c12` |
| `context-minimizer` | [Context] Erika | `#1abc9c` |
| `quota-steward` | [Quota] Bill | `#ffb020` |
| `planner-partitioner` | [Planner] Oak | `#795548` |
| `release-manager` | [Release] Lance | `#8e44ad` |
| `product-agent` | [Product] Leaf | `#27ae60` |
| `architect-agent` | [Architect] Steven | `#34495e` |
| `repo-cartographer` | [Cartographer] Roark | `#607d8b` |
| `issue-intake-researcher` | [Intake] Joy | `#ff6b9d` |
| `code-implementer` | [Builder] Brock | `#3498db` |
| `frontend-ui-agent` | [Frontend] Skyla | `#ff6a35` |
| `backend-service-agent` | [Backend] Volkner | `#2980b9` |
| `database-migration-agent` | [Database] Bertha | `#16a085` |
| `integration-broker` | [Integration] Juan | `#e17055` |
| `qa-agent` | [QA] Misty | `#2ecc71` |
| `code-reviewer` | [Reviewer] Gary | `#9b59b6` |
| `security-auditor` | [Security] Surge | `#e74c3c` |
| `systems-synthesizer` | [Synth] Blaine | `#e67e22` |
| `memory-curator` | [Memory] Lenora | `#a29bfe` |
| `docs-agent` | [Docs] Dawn | `#74b9ff` |
| `agentos-operator` | [Operator] Red | `#00f5ff` |

**Aliases:** `builder-agent`→implementer, `security-agent`→auditor, `reviewer-agent`→reviewer.

**Code:** `apps/api/src/discord/personas.ts`, `apps/command-center/src/lib/agent-avatars.ts`.

**Dashboard presence strip (8):** Ash, Leaf, Steven, Brock, Misty, Surge, Gary, Dawn.

## Art assets — current vs needed

### Per-agent minimum (now)

One transparent **`{agent-id}.png`** (512 master → 128 export) in:

- `apps/command-center/public/agents/`
- `apps/api/public/agents/`

Readable at **52px circle crop**; accent color in portrait trim.

### Have PNG (16)

admin, agentos-operator, architect, builder, context-minimizer, docs, issue-intake, planner, product, qa, quota-steward, release-manager, reviewer, security, systems-synthesizer, task-classifier.

### Missing PNG (6)

`repo-cartographer`, `memory-curator`, `frontend-ui-agent`, `backend-service-agent`, `database-migration-agent`, `integration-broker`.

### Future per agent (template)

- `{agent-id}-hero.png` 256×256
- `{agent-id}-banner.png` 600×200
- 7 expression PNGs 128×128
- Optional ribbons, Discord status variants

**Style:** pixel bust, transparent, Forge palette; no baked backgrounds.

## Future dashboard vision (not built)

- Agent **profile cards** (day summary, shift log, dreams/memory inbox)
- **Ribbons** with audit-linked evidence
- **Social graph** (collaborators, friction signals)
- Crew weather, quota horizon, dream inbox, ribbon ceremony toasts
- Generated app preview when run produces real URL

## Key implementation paths

```text
packages/ui/src/tokens/agentos-forge.css
packages/ui/src/components/TopNav.tsx, AgentPresenceOrb.tsx, MissionTimeline.tsx
apps/command-center/src/components/forge/
apps/command-center/src/components/local/AgentOSLocalApp.tsx
apps/command-center/src/lib/agent-avatars.ts, dashboard-adapters.ts
apps/api/src/session.ts, discord/personas.ts, discord/agent-avatars.ts
apps/command-center/next.config.mjs          # /agentos-api rewrite
docs/design/agentos-forge-style-study.md
.agentos/ui-style.md
```

## Open items

1. Six missing agent portraits
2. Compress PNGs → WebP for dashboard perf
3. Wordmark SVG + OG image `1200×630`
4. Discord stay-logged-in: restart API after `.env` cookie changes; re-login once
5. `/preview` route deferred until live preview URL
6. Profile/ribbon/social UI — design approved, not implemented

## Related

- [[flows/cursor-memory]] — rolling Cursor session index
- [[sessions/cursor/49de712f-f8ab-41ac-af48-5827eb232388]] — source session
- [[areas/apps-command-center]]
- [[packages/ui]]
- `docs/AGENTOS_SESSION_CONTEXT.md` — repo-wide handoff

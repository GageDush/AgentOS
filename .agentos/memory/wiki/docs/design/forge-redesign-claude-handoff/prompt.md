---
slug: docs/design/forge-redesign-claude-handoff/prompt
title: Prompt
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Prompt

Source: `docs/design/forge-redesign-claude-handoff/prompt.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Forge Redesign — Claude Design Handoff

**Last updated:** 2026-06-15  
**Branch:** `pivot/agentos-local-command-center`  
**Repo:** `C:\Users\gaged\Documents\AgenOS` (GitHub: `GageDush/AgentOS`)

Use **`chatbox.txt`** for paste-into-Claude chat. This file is the full reference.

---|----------|
| Orange tokens globally | Home still uses seed/demo data |
| `/` new handoff layout (ForgeHome) | Inner routes use different nav shell |
| Inner routes live-wired to SQLite/API | Handoff prototype layouts not ported |
| Blue/violet legacy scrubbed in key CSS/docs | flous.dev/docs not indexed into memory wiki |
| Discord session → approval attribution | Run Inspector shows on all routes |
| Ollama running locally | Public tunnel (flous.dev) separate from stack restart |

**Next milestone:** one PR that unifies navigation shell, wires home to live API, and scopes Run Inspector — *before* porting more handoff page layouts.

---

## Design canon (mandatory)

All new work must follow these sources. **Do not reintroduce blue/violet Halo (`#6b9fff`, `#7c6fff`) as primary accents.**

| Resource | Path |
|----------|------|
| CSS tokens | `packages/ui/src/tokens/agentos-forge.css` |
| Design system spec | `apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md` |
| Agent style memory | `.agentos/ui-style.md` |
| Open CoDesign workspace memory | `.agentos/codesign/DESIGN.md` |
| Style study | `docs/design/agentos-forge-style-study.md` |

### Core tokens

| Token | Value | Role |
|-------|-------|------|
| Background | `#0A0908` | Warm near-black page base |
| Surface | `#1C1A17` | Cards, panels |
| Accent | `#FF6A35` | Primary actions, active nav, glows |
| OK / Warn / Err | `#22C97A` / `#F5A623` / `#EF4545` | Runtime status only |

### Voice & vocabulary

- Calm, operational, direct. Second person, present tense.
- **Mission** not task; **Control Gate** not permission prompt; **Approve once** not grant permission.
- No emoji in nav or status labels.

---

## Two UI families (same theme, different shells)

This is the most important architectural fact for design work.

### Family A — Marketing / handoff home (`/` only)

| Aspect | Detail |
|--------|--------|
| Component | `apps/command-center/src/components/forge-home/ForgeHome.tsx` |
| Data | `forge-home-data.tsx` — **seed/demo**, not live API |
| Nav | Centered **pill buttons** (Dashboard, Missions, Control Gate

## Related

- [[index]]
- [[areas/repo-layout]]

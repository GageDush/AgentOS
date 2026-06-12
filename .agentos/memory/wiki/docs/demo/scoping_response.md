---
slug: docs/demo/scoping_response
title: SCOPING RESPONSE
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# SCOPING RESPONSE

Source: `docs/demo/SCOPING_RESPONSE.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS — Scoping Response (Gage · 2026-06-12)

Derived from web form export. **"defer"** resolved to recommended defaults below.

---|----------|-----|
| **Wave 1** | P4, P7 (foundation UX + memory) | Priority 1; unblocks operator visibility and context |
| **Wave 2** | P1 → P2 → P3 | Developer spine: implement → gate → ship |
| **Wave 3** | P5 | Discord/CI hardening in parallel with Wave 2 tail |
| **Wave 4** | P6 | Scale design; SQLite stays until Wave 4 cutover |
| **Wave 5** | P8 | Tag `agentos-V1` |
| **Wave 6** | P9 | Phased — not full visual editor v1 |

**Resolved globals**

| Field | Your answer | Locked decision |
|-------|-------------|-----------------|
| Implementer | both | Cursor for multi-file edits; gateway for verify (test/typecheck/git) |
| Hosting | defer | **SQLite + local queue until P6 cutover** |
| CI | both | GitLab + GitHub Actions jobs (same scripts) |
| Cross-cutting | defer | Mock-safe CI; Ollama default; cloud opt-in; strict sanitization |

---

## P1 — Tool catalog (your question)

**Already in scope (you selected):** Read, Grep, Shell, Write/Edit (patch apply)

**Recommended additions for v1 implementer broker**

| Tool | Purpose | Gate | Notes |
|------|---------|------|-------|
| `glob.list` | Find files by pattern | No | Safer than shell find |
| `git.diff` | View changes | No | Feeds review gates |
| `git.status` | Working tree state | No | Pre-commit checks |
| `git.add` / `git.commit` | Stage & commit | **Control Gate** | P3 release path |
| `git.push` | Push to origin | **Control Gate** | You chose origin only |
| `pnpm.test` | Run tests (scoped) | No | Via gateway alias |
| `pnpm.typecheck` | Typecheck | No | Via gateway alias |
| `memory.search` | Pull approved memories | No | Ties to P7 |
| `task.spawn` | Dispatch subagent (bounded) | **Control Gate** | For "agent training" loops later |
| `patch.apply` | Unified diff apply | Yes if outside sandbox | Already partial in codebase |

**Defer to v2 (powerful / risky)**

| Tool | Why defer |
|------|-----------|
| `web.fetch` | SSRF / secret leak risk |
| `deploy.*` | Production blast radius |
| Arbitrary `curl` / `npm install` | Supply chain + network |
| Full `git push --force` | Destructive |

**configs/default-tools.yaml** already lists: `memory.search`, `usage.record`, `file.write`, `terminal.run`, `deploy.product

## Related

- [[index]]
- [[areas/repo-layout]]

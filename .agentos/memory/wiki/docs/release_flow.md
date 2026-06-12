---
slug: docs/release_flow
title: RELEASE FLOW
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# RELEASE FLOW

Source: `docs/RELEASE_FLOW.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Release Flow

## Environment matrix (Gage scope)

| Variable | Value | Effect |
|----------|-------|--------|
| `AGENTOS_AUTOPILOT_RELEASE` | `true` | Open PR after gates pass |
| `AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL` | `false` | No extra human release approve |
| `AGENTOS_REQUIRE_HUMAN_APPROVAL` | `true` | Control Gate still applies to risky commands |
| `AGENTOS_GITHUB_REPO` | `GageDush/AgentOS` | PR target |

## Sequence

1. Mission completes implementer + QA/security/review gates
2. `POST /runs/:id/release/prepare` — release manager report
3. `POST /runs/:id/release/approve` — marks release gate passed
4. Gateway: `git add` / `git commit` (AgentOS bot identity) on **current branch**
5. `git push origin` (Control Gate if policy requires)
6. `POST /runs/:id/release/pr` — GitHub PR via API
7. Discord release card (when configured)

## Branch strategy

**Current branch** — commits land on checked-out branch; operator ensures branch is correct before mission.

## UI

- Forge Release panel / Blackbox release block: branch, sha, `prUrl`
- Quick actions: `release`, `approve_release`

## Related

- [[index]]
- [[areas/repo-layout]]

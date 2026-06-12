---
slug: planning/chatgpt/sanitization-policy
title: AgentOS Sanitization Policy
tags: [chatgpt, planning, og-board, bundle-git]
valid_from: 2026-06-12
---
# AgentOS Sanitization Policy
OG AgentOS planning material from the ChatGPT project board.
## Metadata
- Source path: `AgentOS_Project_Bundle/docs/SANITIZATION_POLICY.md`
- Source kind: bundle-git
- ChatGPT project: [AgentOS planning board](https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project)
- Updated: 2026-06-12T13:48:23.207Z
## Outline

- AgentOS Sanitization Policy
- Canonical names
- Forbidden product-facing references
- Allowed location for third-party references
- Source areas to sanitize
- Required CI behavior
## Content
# AgentOS Sanitization Policy

AgentOS must be treated as a new product identity.

## Canonical names

| Concept | AgentOS name |
|---|---|
| Product | AgentOS |
| Dashboard | AgentOS Command Center |
| Runtime | AgentOS Runtime |
| Gateway | AgentOS Gateway |
| Main orchestrator | AgentOS Operator |
| Default agent team | AgentOS Production Team |
| CLI command | `agentos` |
| Environment variable prefix | `AGENTOS_` |

## Forbidden product-facing references

Do not use inherited/source-project names in product-facing code, prompts, UI, commands, package metadata, runtime logs, or agent personalities.

Forbidden outside legal/reference files:

```text
OpenClaw
openclaw
OPENCLAW
Clawwright
clawwright
Factory.ai
Factory AI
Droid
Droids
droid
Mission Control
BaseOps
BaseOps HQ
```

## Allowed location for third-party references

Original-source provenance, license notes, and legally required attribution may exist only in:

```text
docs/legal/SOURCE_REFERENCES.md
docs/legal/THIRD_PARTY_NOTICES.md
LICENSES/
```

## Source areas to sanitize

```text
src/
app/
components/
pages/
public/
styles/
server/
api/
workers/
packages/
prompts/
agents/
skills/
tools/
scripts/
config/
.env.example
package.json
README.md
CHANGELOG.md
docker-compose.yml
Dockerfile
.github/workflows/
```

## Required CI behavior

Every pull request should run:

```bash
pnpm sanitize:check
```

The check must fail if forbidden branding appears outside legal/reference files.


_(truncated for wiki; full text kept in import source.)_
## Related
- [[planning/chatgpt/index]]
- [[planning/chatgpt/agentos-project]]
- [[index]]
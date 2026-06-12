---
slug: docs/demo/demo_prerequisites
title: DEMO PREREQUISITES
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# DEMO PREREQUISITES

Source: `docs/demo/DEMO_PREREQUISITES.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Demo Prerequisites

## Environment
- Windows 11 + WSL2 (Ubuntu recommended) or native Windows
- Node.js 22+
- pnpm (`corepack enable`)
- Optional: Ollama + `qwen2.5-coder:7b`

## Ports
| Port | Service |
|------|---------|
| 3000 | Command Center |
| 8787 | API |
| 8790 | Gateway |

## Setup
[code block omitted]

## Discord (full integration)
Fill `.env`: `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `SESSION_SECRET`, `DISCORD_OAUTH_REDIRECT_URI_PROD`.

[code block omitted]

## Cloudflare tunnel
[code block omitted]

## Pre-demo checklist
[code block omitted]

## Related

- [[index]]
- [[areas/repo-layout]]

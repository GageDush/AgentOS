---
slug: apps/api
title: Api
tags: [app, monorepo, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# @agentos/api
AgentOS app workspace unit.
## Role
Runnable service under `apps/api/`.
## Workspace dependencies
- `@agentos/agents`
- `@agentos/memory`
- `@agentos/orchestrator`
- `@agentos/persistence`
- `@agentos/queue`
- `@agentos/runtime`
- `@agentos/sandbox`
- `@agentos/shared`
- `@agentos/token-manager`
## Source layout

- `src/auth-pages.test.ts`
- `src/auth-pages.ts`
- `src/cursor-bridge-smoke.mjs`
- `src/cursor-bridge.test.ts`
- `src/cursor-bridge.ts`
- `src/discord/`
  - `src/discord/agent-avatars.test.ts`
  - `src/discord/agent-avatars.ts`
  - `src/discord/agent-profiles.ts`
  - `src/discord/artwork.test.ts`
  - `src/discord/artwork.ts`
  - `src/discord/bootstrap.ts`
  - `src/discord/bots.ts`
  - `src/discord/button-handlers.test.ts`
  - `src/discord/button-handlers.ts`
  - `src/discord/channel-guides.ts`
  - `src/discord/chat-rooms.test.ts`
  - `src/discord/chat-rooms.ts`
  - `src/discord/chat.test.ts`
  - `src/discord/chat.ts`
  - `src/discord/client.ts`
  - `src/discord/commands.test.ts`
  - `src/discord/commands.ts`
  - `src/discord/components.test.ts`
  - `src/discord/components.ts`
  - `src/discord/cursor-channel.ts`
  - `src/discord/embeds.test.ts`
  - `src/discord/embeds.ts`
  - `src/discord/gateway.test.ts`
  - `src/discord/gateway.ts`
  - `src/discord/interaction-respond.test.ts`
  - `src/discord/interaction-respond.ts`
  - `src/discord/interactions.integration.test.ts`
  - `src/discord/interactions.test.ts`
  - `src/discord/interactions.ts`
  - `src/discord/layout.ts`
  - `src/discord/message-attribution.ts`
  - `src/discord/messenger.test.ts`
  - `src/discord/messenger.ts`
  - `src/discord/mission-briefing.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[apps/api]]

---
slug: areas/dependency-graph
title: Dependency graph
tags: [monorepo, packages, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Dependency graph

Workspace `dependencies` ( @agentos/* only ).

## apps/api

- `@agentos/agents`
- `@agentos/memory`
- `@agentos/orchestrator`
- `@agentos/persistence`
- `@agentos/queue`
- `@agentos/runtime`
- `@agentos/sandbox`
- `@agentos/shared`
- `@agentos/token-manager`

## apps/command-center

- `@agentos/shared`
- `@agentos/ui`
- `@agentos/app-generator`

## apps/gateway

- `@agentos/sandbox`
- `@agentos/shared`

## apps/scheduler

- `@agentos/queue`

## apps/worker

- `@agentos/persistence`
- `@agentos/runtime`
- `@agentos/shared`

## packages/agents

- `@agentos/memory`
- `@agentos/persistence`
- `@agentos/shared`

## packages/app-generator

- `@agentos/shared`
- `@agentos/ui`

## packages/game-schema

- _(no workspace deps)_

## packages/memory

- `@agentos/shared`

## packages/orchestrator

- `@agentos/agents`
- `@agentos/memory`
- `@agentos/persistence`
- `@agentos/shared`

## packages/persistence

- `@agentos/shared`

## packages/queue

- _(no workspace deps)_

## packages/runtime

- `@agentos/agents`
- `@agentos/app-generator`
- `@agentos/orchestrator`
- `@agentos/persistence`
- `@agentos/sandbox`
- `@agentos/shared`
- `@agentos/token-manager`

## packages/sandbox

- _(no workspace deps)_

## packages/shared

- _(no workspace deps)_

## packages/token-manager

- `@agentos/shared`

## packages/ui

- `@agentos/shared`

## Related

- [[index]]
- [[areas/repo-layout]]

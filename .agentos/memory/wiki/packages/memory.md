---
slug: packages/memory
title: Memory
tags: [package, monorepo, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# @agentos/memory
AgentOS package workspace unit.
## Role
Shared library under `packages/memory/`.
## Workspace dependencies
- `@agentos/shared`
## Key exports

- `MemoryInput`
- `createMemory`
- `searchMemories`
- `rankMemories`
- `VectorMemoryAdapter`
- `pgvectorMemoryAdapter`
## Source layout

- `src/index.test.ts`
- `src/index.ts`
- `src/wiki/`
  - `src/wiki/chatgpt-planning.test.ts`
  - `src/wiki/chatgpt-planning.ts`
  - `src/wiki/context-bridge.test.ts`
  - `src/wiki/context-bridge.ts`
  - `src/wiki/cursor-sync.ts`
  - `src/wiki/cursor-transcripts.test.ts`
  - `src/wiki/cursor-transcripts.ts`
  - `src/wiki/flags.ts`
  - `src/wiki/frontmatter.ts`
  - `src/wiki/graph.ts`
  - `src/wiki/index-manifest.ts`
  - `src/wiki/index.ts`
  - `src/wiki/links.ts`
  - `src/wiki/load.ts`
  - `src/wiki/paths.ts`
  - `src/wiki/redact.ts`
  - `src/wiki/retrieve.ts`
  - `src/wiki/sections.test.ts`
  - `src/wiki/sections.ts`
  - `src/wiki/serialize.ts`
  - `src/wiki/slugify.ts`
  - `src/wiki/types.ts`
  - `src/wiki/wiki.test.ts`
  - `src/wiki/writer.test.ts`
  - `src/wiki/writer.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

---
slug: packages/app-generator
title: App Generator
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-12
---
# @agentos/app-generator
AgentOS package workspace unit.
## Role
Shared library under `packages/app-generator/`.
## Workspace dependencies
- `@agentos/shared`
- `@agentos/ui`
## Key exports

- `resolveUiPreset`
- `resolveUiSurfaces`
- `buildUiGenerationSpec`
- `getForgeTemplatePaths`
- `FORGE_UI_SPEC`
- `resolveOutputDir`
- `scaffoldApp`
- `type ScaffoldResult`
## Source layout

- `src/index.ts`
- `src/scaffold.test.ts`
- `src/scaffold.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-12T13:43:32** — memory-curator: Cursor: You are working inside the AgentOS repository in Cursor. Your job is to implement a premium AgentOS UI/UX system inspired by the provided Fa (scope: packages/ui/, packages/ui/src/tokens/agentos-forge.css, packages/ui/src/motion/, packages/app-generator/templates/agentos-forge/; artifacts: cursor-transcript)

See also: [[packages/ui]]

See also: [[areas/apps-command-center]]

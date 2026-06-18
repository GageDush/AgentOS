---
slug: packages/app-generator
title: App Generator
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-16
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

- **2026-06-17T00:11:00** — memory-curator: Cursor: You are working inside the AgentOS repository in Cursor. Your job is to implement a premium AgentOS UI/UX system inspired by the provided Fa (scope: packages/ui/, packages/ui/src/tokens/agentos-forge.css, packages/ui/src/motion/, packages/app-generator/templates/agentos-forge/; artifacts: cursor-transcript)

See also: [[packages/ui]]

See also: [[areas/apps-command-center]]

- **2026-06-17T01:08:28** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Figma description: Plugin that includes the Figma MCP server and Skills for common work (scope: packages/ui, docs/design/, docs/design/platform-gallery-handoff/, packages/ui-blocks/; artifacts: cursor-transcript)

See also: [[packages/ui-blocks]]

See also: [[areas/apps-worker]]

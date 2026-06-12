---
slug: flows/root-scripts
title: Root scripts
tags: [tooling, pnpm, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Root scripts

Key `pnpm` scripts from root `package.json`.

## Development

- `pnpm dev` — `pnpm dev:full`
- `pnpm dev:full` — `pnpm --parallel --filter @agentos/api --filter @agentos/command-center --filter @agentos/gateway --filter @agentos/worker dev`
- `pnpm dev:api` — `pnpm --filter @agentos/api dev`
- `pnpm dev:stack` — `pnpm --parallel --filter @agentos/command-center --filter @agentos/gateway --filter @agentos/worker dev`
- `pnpm control` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/agentos-control.ps1`
- `pnpm stack:background` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/agentos-background.ps1 -Action Start`
- `pnpm stack:restart` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/agentos-background.ps1 -Action Restart`
- `pnpm stack:stop` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/agentos-background.ps1 -Action Stop`
- `pnpm stack:status` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/agentos-background.ps1 -Action Status`

## Verification

- `pnpm typecheck` — `pnpm -r typecheck`
- `pnpm test` — `pnpm -r test`
- `pnpm memory:migrate-wiki` — `node scripts/migrate-memory-to-wiki.mjs`
- `pnpm wiki:rebuild-manifest` — `tsx scripts/rebuild-wiki-manifest.mjs`
- `pnpm wiki:index-repo` — `tsx scripts/wiki-index-repo.mjs`
- `pnpm wiki:benchmark` — `tsx scripts/wiki-memory-benchmark.mjs`
- `pnpm sanitize:check` — `node scripts/sanitize-agentos.mjs`
- `pnpm env:check` — `node scripts/validate-env.mjs`
- `pnpm smoke:full` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-full.ps1`

## Related

- [[flows/test-commands]]
- [[index]]

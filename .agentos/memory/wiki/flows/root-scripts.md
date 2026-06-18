---
slug: flows/root-scripts
title: Root scripts
tags: [tooling, pnpm, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Root scripts

Key `pnpm` scripts from root `package.json`.

## Development

- `pnpm dev` — `pnpm dev:full`
- `pnpm dev:full` — `pnpm --parallel --filter @agentos/api --filter @agentos/command-center --filter @agentos/gateway --filter @agentos/worker dev`

## Verification

- `pnpm typecheck` — `pnpm -r typecheck`
- `pnpm test` — `pnpm -r test`
- `pnpm memory:migrate-wiki` — `node scripts/migrate-memory-to-wiki.mjs`
- `pnpm wiki:rebuild-manifest` — `tsx scripts/rebuild-wiki-manifest.mjs`
- `pnpm wiki:index-repo` — `tsx scripts/wiki-index-repo.mjs`
- `pnpm wiki:sync-cursor` — `tsx scripts/wiki-sync-cursor.mjs`
- `pnpm wiki:meta-reset` — `node .agentos/scripts/reset-wiki-meta-drift.mjs`
- `pnpm wiki:sync-chatgpt` — `tsx scripts/wiki-sync-chatgpt.mjs`
- `pnpm wiki:benchmark` — `tsx scripts/wiki-memory-benchmark.mjs`
- `pnpm sanitize:check` — `node scripts/sanitize-agentos.mjs`
- `pnpm env:check` — `node scripts/validate-env.mjs`
- `pnpm smoke:full` — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-full.ps1`

## Related

- [[flows/test-commands]]
- [[index]]

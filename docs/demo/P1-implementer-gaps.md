# P1 — Implementer realism gap audit

Last updated: 2026-06-12 (P1 step 1)

## Dispatch modes (`AGENTOS_IMPLEMENTER_MODE`)

| Mode | Real today | Gap |
|------|------------|-----|
| **mock** | Profile-aware LLM summary only | No file changes, no commands |
| **gateway** | Patch apply (optional LLM diff) + allowlisted shell aliases via `executeCommand` | No Read/Grep tool loop; patch generation depends on LLM |
| **cursor** | `@cursor/sdk` prompt + patch apply from response | External; requires `CURSOR_API_KEY` |

## Patch apply

- `AGENTOS_IMPLEMENTER_APPLY_PATCHES` (default true) — `applyUnifiedDiff` in `packages/agents/src/patch-apply.ts`
- Scoped to `contextPacket.repoPaths` / envelope `filesInScope`

## Tool execution (`FEATURE_TOOL_EXECUTION`)

- **Before P1:** flag exists in `.env.example` only; no broker
- **After P1 (complete):** `ToolRequest`/`ToolResult`; gateway `POST /tools/invoke`; `executeTool` + `probeImplementerContext`; `runFixVerifyLoop`; `ToolLoopBudget`; runtime dispatch metadata for Blackbox

## Gateway allowlist (`apps/gateway`)

Shell aliases only: `git status`, `git diff`, `git diff --name-only`, `pnpm test`, `pnpm typecheck`, `pnpm lint`

## Runtime wiring

- `packages/runtime/src/index.ts` → `dispatchImplementerWork` with `executeGatewayCommand` callback
- Fix-verify loop (3 retries): **implemented** (`packages/agents/src/fix-verify.ts`)
- Tool iteration caps (32 / 30 min): **implemented** (`packages/agents/src/tool-loop.ts`)

## Touchpoints for remaining P1 steps

| Step | Files |
|------|-------|
| 6–7 | `packages/runtime`, `packages/agents/src/tool-broker.ts` |
| 8 | `apps/command-center` Blackbox dispatch metadata |
| 9 | `packages/runtime` integration test |
| 10 | `configs/default-tools.yaml`, `PROJECT_WAVE_RUNNER.md` |

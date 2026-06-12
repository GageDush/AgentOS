---
slug: areas/config
title: Configuration reference
tags: [config, env, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Configuration reference

Environment variable **names** from `.env.example` only (no values).

## Feature flags

- `FEATURE_OLLAMA`
- `FEATURE_OLLAMA_CLASSIFIER`
- `FEATURE_AGENT_LLM`
- `FEATURE_MEMORY_WIKI`
- `FEATURE_DISCORD`
- `FEATURE_DEMO_MODE`
- `FEATURE_CLOUD_PROVIDERS`
- `FEATURE_TOOL_EXECUTION`
- `FEATURE_LLM_TOOL_LOOP`
- `FEATURE_TASK_SPAWN`
- `FEATURE_DISCORD_CURSOR`

## AgentOS runtime

- `AGENTOS_APP_NAME`
- `AGENTOS_DASHBOARD_NAME`
- `AGENTOS_ENV`
- `AGENTOS_API_PORT`
- `AGENTOS_GATEWAY_PORT`
- `AGENTOS_COMMAND_CENTER_PORT`
- `AGENTOS_MODEL_PROVIDER`
- `AGENTOS_DEFAULT_MODEL`
- `AGENTOS_NO_SELF_APPROVAL`
- `AGENTOS_IMPLEMENTER_MODE`
- `AGENTOS_IMPLEMENTER_DISPATCH`
- `AGENTOS_CLASSIFIER_TIER2`
- `AGENTOS_IMPLEMENTER_APPLY_PATCHES`
- `AGENTOS_MEMORY_DECAY`
- `AGENTOS_MEMORY_WIKI_WRITE`
- `AGENTOS_DISCORD_BRIEFING_ON_COMPLETE`
- `AGENTOS_TOOL_MAX_ITERATIONS`
- `AGENTOS_TOOL_MAX_MINUTES`
- `AGENTOS_FIX_VERIFY_RETRIES`
- `AGENTOS_FIX_VERIFY_COMMAND`
- `AGENTOS_SEMGREP_REQUIRED`
- `AGENTOS_SEMGREP_GATE`
- `AGENTOS_REQUIRE_HUMAN_APPROVAL`
- `AGENTOS_AUTOPILOT_RELEASE`
- `AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL`
- `AGENTOS_SANITIZATION_MODE`
- `AGENTOS_DAILY_BUDGET_USD`
- `AGENTOS_MONTHLY_BUDGET_USD`
- `AGENTOS_WARNING_THRESHOLD_PERCENT`
- `AGENTOS_HARD_STOP_ENABLED`
- `AGENTOS_GITHUB_REPO`
- `AGENTOS_CURSOR_BILLING_DAY`
- `AGENTOS_PUBLIC_APP_URL`
- `AGENTOS_OAUTH_SUCCESS_REDIRECT`
- `AGENTOS_API_BASE_URL`
- `AGENTOS_DISCORD_AVATAR_BASE_URL`
- `AGENTOS_DISCORD_AVATAR_BASE_URL`
- `AGENTOS_CURSOR_REPO_CWD`
- `AGENTOS_CURSOR_MODEL`
- `AGENTOS_COOKIE_DOMAIN`
- `AGENTOS_SESSION_MAX_AGE_SECONDS`

## Scripts

- `scripts/acceptance-gate.ps1`
- `scripts/agentos-background.ps1`
- `scripts/agentos-control.ps1`
- `scripts/bootstrap-discord-guild.ts`
- `scripts/db-migrate.mjs`
- `scripts/db-reset.mjs`
- `scripts/db-seed.mjs`
- `scripts/demo-smoke.ps1`
- `scripts/demo.ps1`
- `scripts/discord-interactions-mode.mjs`
- `scripts/install-agentos-autostart.ps1`
- `scripts/kick-discord-bots.ts`
- `scripts/migrate-memory-to-wiki.mjs`
- `scripts/mission-execution-smoke.mjs`
- `scripts/patch-env-spine.mjs`
- `scripts/post-discord-channel-guides.ts`
- `scripts/project-wave-runner.mjs`
- `scripts/project-wave-runner.ps1`
- `scripts/rebuild-wiki-manifest.mjs`
- `scripts/repair-cloudflare-tunnel.ps1`
- `scripts/restructure-discord-guild.ts`
- `scripts/run-project-wave-auto.mjs`
- `scripts/sanitize-agentos.mjs`
- `scripts/setup-cloudflare-tunnel.ps1`
- `scripts/setup-cursor-channel.ts`
- `scripts/setup-operator-command-channel.ts`
- `scripts/smoke-full.mjs`
- `scripts/smoke-full.ps1`
- `scripts/spine-demo.mjs`
- `scripts/spine-test-and-report.mjs`
- `scripts/sync-discord-commands.ts`
- `scripts/sync-discord-roles.ts`
- `scripts/validate-env.mjs`
- `scripts/wiki-index-repo.mjs`
- `scripts/wiki-memory-benchmark.mjs`

## Related

- [[areas/risk-areas]]
- [[flows/test-commands]]
- [[index]]

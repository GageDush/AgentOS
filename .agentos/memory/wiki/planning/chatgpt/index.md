---
slug: planning/chatgpt/index
title: ChatGPT planning board
tags: [chatgpt, planning, index]
valid_from: 2026-06-12
---
# ChatGPT planning board (AgentOS)

Canonical ChatGPT project: [AgentOS planning board](https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project)

Indexed from the original project bundle and any markdown dropped in `.agentos/imports/chatgpt/`.

## Indexed documents

| Article | Source | Updated |
| --- | --- | --- |
| [[planning/chatgpt/asset-manifest-and-needs]] | `AgentOS_Project_Bundle/docs/ASSET_MANIFEST_AND_NEEDS.md` | 2026-06-12 |
| [[planning/chatgpt/agentos-master-codex-prompt]] | `AgentOS_Project_Bundle/AGENTOS_MASTER_CODEX_PROMPT.md` | 2026-06-12 |
| [[planning/chatgpt/memory-and-token-systems]] | `AgentOS_Project_Bundle/docs/MEMORY_AND_TOKEN_SYSTEMS.md` | 2026-06-12 |
| [[planning/chatgpt/phaser-office-implementation-plan]] | `AgentOS_Project_Bundle/docs/PHASER_OFFICE_IMPLEMENTATION_PLAN.md` | 2026-06-12 |
| [[planning/chatgpt/readme]] | `AgentOS_Project_Bundle/README.md` | 2026-06-12 |
| [[planning/chatgpt/sanitization-policy]] | `AgentOS_Project_Bundle/docs/SANITIZATION_POLICY.md` | 2026-06-12 |
| [[planning/chatgpt/codex-repair-prompt]] | `AgentOS_Project_Bundle/CODEX_REPAIR_PROMPT.md` | 2026-06-12 |
| [[planning/chatgpt/generated-asset-prompts]] | `AgentOS_Project_Bundle/asset_prompts/GENERATED_ASSET_PROMPTS.md` | 2026-06-12 |
| [[planning/chatgpt/simple-codex-steps]] | `AgentOS_Project_Bundle/SIMPLE_CODEX_STEPS.md` | 2026-06-12 |

## Refresh

- Drop new ChatGPT exports (`.md`) into `.agentos/imports/chatgpt/`
- Run `pnpm wiki:sync-chatgpt`
- API: `POST /memory/wiki/sync-chatgpt`

## Related

- [[planning/chatgpt/agentos-project]]
- [[docs/overview]]
- [[flows/cursor-memory]]
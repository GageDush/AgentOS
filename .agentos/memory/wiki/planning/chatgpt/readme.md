---
slug: planning/chatgpt/readme
title: AgentOS Project Bundle
tags: [chatgpt, planning, og-board, bundle-git]
valid_from: 2026-06-12
---
# AgentOS Project Bundle
OG AgentOS planning material from the ChatGPT project board.
## Metadata
- Source path: `AgentOS_Project_Bundle/README.md`
- Source kind: bundle-git
- ChatGPT project: [AgentOS planning board](https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project)
- Updated: 2026-06-12T13:48:22.765Z
## Outline

- AgentOS Project Bundle
- What AgentOS is
- Core goals
- Included files
- Recommended use
- Important asset note
## Content
# AgentOS Project Bundle

Generated: 2026-05-30

This bundle consolidates the AgentOS planning work from the chat into a reusable project package.

## What AgentOS is

**AgentOS** is a new, sanitized, local-first AI agent operations platform.

The intended product is:

> **AgentOS Command Center** — a Phaser-based interactive pixel-art office dashboard where agents, rooms, desks, terminals, boards, and system objects can be clicked to open real agent-control interfaces. Discord acts as the mobile command surface.

## Core goals

1. Build a unique AgentOS product from the ground up.
2. Use a pixel-art operations office as the main dashboard.
3. Use a supervised prebuilt AI production team.
4. Include memory management.
5. Include token and credit management so API usage does not run away.
6. Include approval gates and audit logs.
7. Include Discord/mobile interaction.
8. Keep all product-facing names, prompts, commands, UI labels, and source files sanitized to AgentOS branding.
9. Keep any legally required third-party source notices only in `docs/legal/`.

## Included files

- `AGENTOS_MASTER_CODEX_PROMPT.md` — the main one-prompt Codex implementation spec.
- `SIMPLE_CODEX_STEPS.md` — the basic step-by-step way to run Codex.
- `CODEX_REPAIR_PROMPT.md` — use this if Codex creates a broken scaffold.
- `docs/PHASER_OFFICE_IMPLEMENTATION_PLAN.md` — the detailed Phaser dashboard plan.
- `docs/ASSET_MANIFEST_AND_NEEDS.md` — generated assets plus remaining asset list.
- `docs/SANITIZATION_POLICY.md` — AgentOS identity and forbidden reference policy.
- `docs/MEMORY_AND_TOKEN_SYSTEMS.md` — memory and token/credit management design.
- `assets/generated/` — generated concept assets from this chat.
- `assets/reference_images/` — user-provided reference images from this chat.
- `asset_prompts/GENERATED_ASSET_PROMPTS.md` — prompts/styles used to generate the assets.

## Recommended use

Create a new empty repo, copy this bundle into it, then ask Codex to implement from:

```text
AGENTOS_MASTER_CODEX_PROMPT.md
```

For best results, start with a clean folder named:

```text
agentos
```

Then run Codex using the instructions in:

```text
SIMPLE_CODEX_STEPS.md
```

## Important asset note

The generated images are strong visual concepts and style sheets, but they are not yet sliced into production spritesheets. A future asset-processing pass should:

- crop individual props/icons/modules;
- clean AI text artifacts;
- remove any unwanted marks;
- export transparent PNG sprites;
- create Phaser texture atlases;
- create JSON metadata for interactable zones;
- make actual animation frames from the character sheets.


_(truncated for wiki; full text kept in import source.)_
## Related
- [[planning/chatgpt/index]]
- [[planning/chatgpt/agentos-project]]
- [[index]]
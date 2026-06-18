---
slug: docs/design/design
title: DESIGN
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# DESIGN

Source: `docs/design/DESIGN.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Naming Structure

## Purpose

This file defines naming structure for the product UI so AgentOS sounds calm, capable, and clear instead of theatrical, militarized, or cosplay-heavy.

This is not a visual design brief. It is only a language and naming guide.

## Core Tone

Prefer:

- plain operational language
- calm product language
- verbs people already use at work
- names that explain the job of a surface

Avoid:

- spy language
- war-room language
- secret-agency language
- overdramatic system names
- labels that sound like a game faction, rank tree, or classified program

## Product Naming Rule

Every surface name should pass this test:

"Would a smart solo developer say this out loud without feeling silly?"

If not, rename it.

## Naming Pattern

Use this structure for major product surfaces:

- simple noun for a destination
- noun phrase for a panel
- verb phrase for an action
- neutral status word for runtime state

Examples:

- `Missions`
- `Approvals`
- `Archive`
- `Memory Wiki`
- `Run History`
- `Provider Status`
- `Create Mission`
- `Pause Run`
- `Approve for Mission`

## Preferred Vocabulary

Use words like:

- mission
- run
- approval
- review
- archive
- memory
- history
- session
- queue
- activity
- settings
- integrations
- loadout
- operators
- agents
- route
- summary
- logs
- status

These words are strong because they are descriptive without trying too hard.

## Avoid Vocabulary

Avoid words like:

- black site
- war room
- command bunker
- strike team
- intel vault
- kill chain
- target package
- dead drop
- classified
- covert
- breach mode
- red cell
- threat theater
- operation room
- tactical dashboard

Also avoid fake-cool labels that make normal features sound absurdly intense:

- `Memory Arsenal`
- `Mission Killboard`
- `Operator Theater`
- `Threat Matrix`
- `Shadow Console`

## Route Naming

Routes should feel like product destinations, not fiction props.

Prefer:

- `/missions`
- `/approvals`
- `/archive`
- `/wiki`
- `/operators`
- `/settings`
- `/loadout`
- `/scraper`

Avoid route names that require lore to understand:

- `/war-room`
- `/vault`
- `/theater`
- `/intel`
- `/ops-center`
- `/shadow-board`

## Navigation Labels

Navigation should use short labels with obvious meaning.

Preferred top-level labels:

- `Dashboard`
- `Missions`
- `Approvals`
- `Activity`
- `Agents`
- `Archive`
- `Wiki`
- `Loadout`
- `Settings

## Related

- [[index]]
- [[areas/repo-layout]]

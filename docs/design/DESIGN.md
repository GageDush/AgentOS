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
- `Settings`

If a label needs explaining, it is probably not a good top-level label.

## Panel Naming

Panels should be named after the question they answer.

Preferred examples:

- `Active Mission`
- `Pending Approvals`
- `Run Inspector`
- `Run History`
- `Provider Status`
- `Recent Activity`
- `Saved Routines`
- `Session Details`
- `Memory Queue`

Avoid panels that sound branded for their own sake:

- `Mission Theater`
- `Operator Deck`
- `Intel Panel`
- `Strike Board`
- `Control Nexus`

## Action Naming

Buttons and commands should be direct and boring in a good way.

Prefer:

- `Create Mission`
- `Run Now`
- `Pause`
- `Resume`
- `Approve Once`
- `Approve for Mission`
- `Deny`
- `Open Wiki`
- `Review Logs`
- `Sync Memory`

Avoid:

- `Deploy Asset`
- `Authorize Strike`
- `Arm Routine`
- `Execute Theater`
- `Escalate to Command`

## Status Naming

Statuses should describe actual runtime state.

Prefer:

- `Queued`
- `Running`
- `Paused`
- `Awaiting Approval`
- `Completed`
- `Failed`
- `Blocked`
- `Offline`
- `Ready`

Avoid:

- `Hot`
- `Armed`
- `Engaged`
- `Combat Ready`
- `In Theater`
- `Redline`
- `Dark`

## Agent Naming

Agent names should sound like roles on a product team, not codenames.

Prefer:

- `Admin Agent`
- `Planner`
- `Reviewer`
- `Security Auditor`
- `Quota Steward`
- `Docs Agent`
- `Builder`
- `Task Classifier`

Avoid:

- `Shadow`
- `Overwatch`
- `Sentinel X`
- `Ghost`
- `Cipher`
- `Viper`
- `Control Prime`

## One Level Of Flavor

AgentOS can keep a little personality, but only in one layer at a time.

Good:

- product is called `AgentOS`
- shell language uses `Forge`
- page names stay plain

Bad:

- product has lore-heavy branding
- every route has a dramatic codename
- every panel has a metaphor
- every button sounds like a movie prop

If the shell has flavor, the working labels underneath it should get plainer.

## Rename Guidance

When renaming a surface, use this order:

1. Describe what it does.
2. Shorten it.
3. Remove lore words.
4. Keep only the smallest amount of product flavor needed.

Examples:

- `Control Gate` -> acceptable if it truly means approval handling
- `Blackbox` -> acceptable if it means audit/log visibility, but treat it as the edge of the naming style
- `Mission Theater` -> rename to `Mission View` or `Run Inspector`
- `Operator Command Deck` -> rename to `Dashboard` or `Control`

## Litmus Test

A label is good if it sounds natural in sentences like:

- "Open Missions and rerun the last job."
- "Check Approvals before you continue."
- "The logs are in Activity."
- "Open the Archive and pull the last summary."
- "Go to Settings and check provider status."

If it sounds like briefing-room roleplay, simplify it.

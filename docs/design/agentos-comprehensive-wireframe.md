# AgentOS Comprehensive Wireframe

## Purpose

This document maps the full AgentOS product surface that originates from the current Command Center, runtime, scraper, memory, approval, and hosted-access work.

It is a product wireframe, not a visual style guide. It defines structure, route intent, panel relationships, states, and handoff boundaries so Codex, Cursor, Claude, Gemini, and future agents can work from the same product map without stepping on each other.

## Product Principle

AgentOS is a calm local-first operator dashboard for agent work.

It should feel like:

- a reliable command center for missions, runs, approvals, memory, and tools
- a daily-use technical product for a solo developer or small team
- a system with clear gates before risky action
- a workspace that explains what happened and what needs attention

It should not feel like:

- a military board
- a spy console
- a fictional command bunker
- a dashboard that values drama over clarity

## Global App Shell

```text
+--------------------------------------------------------------------------------------+
| AgentOS                              Search / Command Palette                   User  |
| Dashboard | Missions | Control Gate | Blackbox | More                               |
+--------------------------------------------------------------------------------------+
| API | Worker | Queue | Approvals | Memory Sync | Provider | Mode | Live/Poll/Offline |
+--------------------------------------------------------------------------------------+
|                                                                                      |
| Page header: route name, short purpose, primary action                               |
|                                                                                      |
| Main route canvas                                                                     |
|                                                                                      |
|                                  Right inspector / detail rail / chat dock            |
|                                                                                      |
+--------------------------------------------------------------------------------------+
```

### Global Rules

- Top navigation is always visible on desktop.
- Health strip is always visible but compact.
- Command palette is first-class navigation and action.
- Right rail is contextual: selected run, approval, agent, wiki article, asset, or settings detail.
- Mobile keeps the same workflow by stacking panels and converting the right rail into a bottom sheet or inline detail section.
- Every route needs an empty, active, loading, error, and offline state.

## Primary Navigation

Visible desktop nav:

- Dashboard
- Missions
- Control Gate
- Blackbox

Overflow nav:

- Agents
- Automations
- Integrations
- Archive
- Memory Wiki
- Settings
- Scraper

Recommended plain-language renames:

- `Control Gate` can remain `Control Gate` or become `Approvals` if the product needs plainer navigation.
- `Blackbox` can remain as an internal route, but the visible label may be `Activity` or `Logs` if it feels too stylized.
- `Automations` maps to `/routines`.
- `Integrations` maps to `/loadout`.
- `Agents` maps to `/operators`.

## Command Palette

```text
+--------------------------------------------------------------+
| Command Palette                                               |
+--------------------------------------------------------------+
| Search commands, routes, missions, wiki, agents...            |
+--------------------------------------------------------------+
| Start Mission                         /missions               |
| Open Approvals                        /control-gate           |
| Run Tests                             /missions               |
| Inspect Settings                      /settings               |
| Sync Memory                           /archive                |
| Open Memory Wiki                      /wiki                   |
| Generate UI Preview                   /preview/forge          |
| Agent: Planner                        /operators              |
+--------------------------------------------------------------+
```

Expected behavior:

- `Esc` closes.
- Keyboard-first filtering.
- Commands show route, impact, and whether approval is needed.
- Risky commands route to approval or step-up instead of executing silently.

## Runtime Health Strip

```text
 API Ready | Worker Ready | Queue 3 | Approvals 2 | Memory Synced | Local Mode | Live
```

States:

- `Ready`
- `Degraded`
- `Offline`
- `Mock`
- `Needs Config`
- `Pending Approval`

The strip should be scannable, not decorative. Clicking a metric should open the relevant inspector or route.

## Signed-Out / Hosted Access

```text
+------------------------------------------------------------------+
| AgentOS                                               flous.dev   |
+------------------------------------------------------------------+
|                                                                  |
|  Operator Access                                                 |
|  Sign in to reach missions, approvals, memory, and agent control. |
|                                                                  |
|  [ Continue with identity provider ]                             |
|                                                                  |
|  Status                                                          |
|  - Network gate: passed / required                               |
|  - API session: missing                                          |
|  - Device trust: unknown                                         |
|                                                                  |
+------------------------------------------------------------------+
```

Requirements:

- If local/mock mode is active, show a local-first banner.
- If hosted mode is active, require operator session for app surfaces.
- Sensitive actions require trusted device or fresh step-up.

## Trusted Device Flow

```text
Sign in -> Device trust prompt -> Dashboard
       -> Continue once        -> Dashboard with step-up required
```

Device prompt:

```text
+------------------------------------------------------------------+
| Trust this device?                                                |
+------------------------------------------------------------------+
| Signed in as operator                                             |
| Device label: [ Windows desktop                                  ]|
| Duration: [ 30 days ] [ 90 days ] [ Session only ]                |
|                                                                  |
| [ Trust Device ] [ Continue Once ]                                |
+------------------------------------------------------------------+
```

Devices panel belongs in Settings:

- list trusted devices
- current device indicator
- revoke device
- rename device
- last seen
- trust expiration

## Dashboard

Purpose: orient the operator in under ten seconds.

```text
+--------------------------------------------------------------------------------------+
| Dashboard                                                                            |
| Track live runs, approvals, memory, and local runtime posture from one surface.       |
+-------------------------------+------------------------------+-----------------------+
| Active Mission                | Pending Approvals            | Runtime Posture       |
| title                         | count + highest risk         | API / worker / queue  |
| objective                     | next approval reason         | provider / mode       |
| current phase + progress      | [ Review ] [ Allow Once ]    | memory / storage      |
+-------------------------------+------------------------------+-----------------------+
| Activity Timeline                                                                    |
| plan, tool calls, stdout/stderr summary, approvals, tests, completion                 |
+------------------------------------------------------+-------------------------------+
| Agent Sessions                                       | Inspector                     |
| active / idle / blocked agents                       | selected run / approval       |
| current role + task                                  | logs, artifacts, next action  |
+------------------------------------------------------+-------------------------------+
| Quick Actions                                                                         |
| [ Start Mission ] [ Open Approvals ] [ Run Tests ] [ Sync Memory ] [ Review Archive ] |
+--------------------------------------------------------------------------------------+
```

Empty state:

- Active Mission: `No active mission`
- CTA: `Create Mission`
- Approvals: `No pending approvals`
- Timeline: recent completed work or setup checklist
- Runtime posture remains visible

Loading state:

- Skeleton cards for mission, approvals, posture, and timeline.
- Health strip can show last known values.

Failure state:

- Show API unreachable or store unreachable.
- Offer retry and local/mock mode explanation.

## Missions

Purpose: compose, launch, inspect, and rerun mission work.

```text
+--------------------------------------------------------------------------------------+
| Missions                                                                  [ New ]    |
+----------------------------------------+---------------------------------------------+
| Compose Mission                        | Run History                                 |
| Title                                  | recent runs                                 |
| Objective                              | status chips                                |
| Prompt / instructions                  | last command / last summary                 |
| Command / task type                    | rerun / inspect                             |
| Provider / model lane                  | linked approvals                            |
| Sandbox / network posture              |                                             |
| Requires approval toggle               |                                             |
| [ Create and Run ]                     |                                             |
+----------------------------------------+---------------------------------------------+
| Active Run Inspector                                                                  |
| route, logs, current phase, approval linkage, memory queue, artifacts                  |
+--------------------------------------------------------------------------------------+
```

Mission lifecycle:

```text
Draft -> Created -> Queued -> Planning -> Running -> Awaiting Approval -> QA -> Review -> Complete
                                              |                              |
                                              v                              v
                                           Denied                         Failed
```

Required states:

- draft valid/invalid
- run queued
- run active
- run blocked
- run awaiting approval
- run complete
- run failed

## Control Gate / Approvals

Purpose: approve or deny risky actions with enough context.

```text
+--------------------------------------------------------------------------------------+
| Control Gate                                                       filters: all/repo  |
+---------------------------------------+----------------------------------------------+
| Approval Queue                        | Selected Approval                            |
| grouped by mission                    | requesting agent                             |
| risk level                            | action summary                               |
| affected scope                        | command preview                              |
| pending / approved / denied           | files/env/network touched                    |
|                                       | why approval is needed                       |
|                                       | [ Allow Once ] [ Allow For Mission ] [ Deny ]|
+---------------------------------------+----------------------------------------------+
| Gate Results                                                                         |
| QA, security, release prep, blocked reasons, audit trail                              |
+--------------------------------------------------------------------------------------+
```

Approval card contents:

- mission title
- run id
- requesting agent
- command/action summary
- risk scope
- correlation id
- timestamp
- decision buttons

Step-up prompt:

```text
+------------------------------------------------------------------+
| Confirm operator device                                           |
| Action: approve tool execution                                    |
| Risk: filesystem + shell command                                  |
| [ Confirm ] [ Re-auth ] [ Deny ]                                  |
+------------------------------------------------------------------+
```

## Blackbox / Activity / Logs

Purpose: answer “what happened?” quickly.

```text
+--------------------------------------------------------------------------------------+
| Blackbox                                                                              |
| Search [ run id / approval / command / agent / error ] Filter [ all | stdout | err ] |
+------------------------------------------+-------------------------------------------+
| Live Run Logs                            | Audit Trail                               |
| plan / exec / stdout / stderr / result   | approvals, denials, route decisions       |
| timestamps                               | operator actions                          |
| log level                                | device/session evidence                   |
+------------------------------------------+-------------------------------------------+
| Diagnostics                                                                            |
| why a run stopped, failed gate, next operator action                                   |
+--------------------------------------------------------------------------------------+
```

Important behavior:

- Failure states should be easier to understand than success states.
- Link every error to mission, run, agent, and approval if available.
- Support copying a compact evidence bundle for another agent.

## Agents / Operators

Purpose: show which agents exist, what roles they perform, and who is active.

```text
+--------------------------------------------------------------------------------------+
| Agents                                                                                |
+---------------------------------------+----------------------------------------------+
| Agent Roster                          | Selected Agent                              |
| Admin Agent                           | role                                         |
| Task Classifier                       | skills                                       |
| Context Minimizer                     | current task                                 |
| Quota Steward                         | last action                                  |
| Planner                               | mission involvement                          |
| Specialist Agents                     | recent outputs                               |
| QA / Security / Reviewer              | limits and approval posture                  |
+---------------------------------------+----------------------------------------------+
| Sessions                                                                             |
| active sessions, paused sessions, resume/pause, handoff owner                         |
+--------------------------------------------------------------------------------------+
```

Agent graph:

```text
Admin Agent
-> Task Classifier
-> Context Minimizer, if repo/docs context needed
-> Quota Steward
-> Planner, if moderate/complex
-> Specialist Agents
-> QA, if code changed
-> Security, if risk triggers matched
-> Code Review, if meaningful diff exists
-> Release Manager, only for commit/PR/release
```

UI should show conditional routing instead of implying every agent runs every time.

## Routines / Automations

Purpose: save repeatable work without hiding risk.

```text
+--------------------------------------------------------------------------------------+
| Automations                                                                           |
+---------------------------------------+----------------------------------------------+
| Create Routine                         | Existing Routines                           |
| title                                  | title + frequency                           |
| objective                              | enabled / disabled                          |
| prompt                                 | next run                                    |
| command                                | risk posture                                |
| frequency                              | run now / pause / resume                    |
| provider / model                       | linked archive output                       |
| approval requirement                   |                                             |
| [ Save Routine ]                       |                                             |
+---------------------------------------+----------------------------------------------+
```

Routine states:

- enabled
- disabled
- paused
- missed run
- awaiting approval
- failed last run
- completed last run

## Archive

Purpose: preserve outputs worth keeping.

```text
+--------------------------------------------------------------------------------------+
| Archive                                                                               |
| Search [ title / mission / summary ] Filter [ all | brief | result | note | memory ] |
+--------------------------------------------------------------------------------------+
| List                                                                                  |
| title | type | linked mission | linked run | created at | preview                    |
+--------------------------------------------------------------------------------------+
| Detail Preview                                                                         |
| full saved summary, source run, artifacts, copy/export/share hooks                     |
+--------------------------------------------------------------------------------------+
```

Archive item types:

- mission summary
- result
- note
- memory candidate
- generated artifact
- scraper gallery handoff
- release summary

## Memory Wiki

Purpose: browse curated project memory.

```text
+--------------------------------------------------------------------------------------+
| Memory Wiki                                                                           |
+--------------------------------------+-----------------------------------------------+
| Article Tree / Search                | Article View                                  |
| product                              | title                                         |
| agents                               | summary                                       |
| sessions                             | content                                       |
| areas                                | backlinks / related docs                      |
| flows                                | source hints                                  |
+--------------------------------------+-----------------------------------------------+
| Suggested Reads / Recently Changed                                                    |
+--------------------------------------------------------------------------------------+
```

Expected interactions:

- search wiki
- open article
- follow backlinks
- show source hints
- show freshness/staleness
- suggest memory sync when local state changed

## Loadout / Integrations

Purpose: configure models, providers, tools, and operational lanes.

```text
+--------------------------------------------------------------------------------------+
| Integrations / Loadout                                                                |
+--------------------------------------+-----------------------------------------------+
| Provider Cards                       | Selected Provider                            |
| OpenAI                               | status                                        |
| local deterministic tools            | credentials needed                            |
| browser/chrome                       | rate limits                                   |
| deployment                           | model/tool lane                               |
| storage                              | test connection                               |
+--------------------------------------+-----------------------------------------------+
| Lane Policy                                                                            |
| deterministic | local | subscription | premium | defer                               |
+--------------------------------------------------------------------------------------+
```

Missing credentials:

- show mock/local fallback
- show what feature is disabled
- never show secret values back to the browser

## Settings

Purpose: configure app posture and operator preferences.

```text
+--------------------------------------------------------------------------------------+
| Settings                                                                              |
+--------------------------------------+-----------------------------------------------+
| Sections                             | Detail                                        |
| Profile                              | operator identity                             |
| Trusted Devices                      | device table + revoke                         |
| Security                             | auth mode, step-up rules                      |
| Runtime                              | local/mock/hosted mode                        |
| Notifications                        | approval and run alerts                       |
| Data / Memory                        | wiki sync, archive policy                     |
| Developer                            | diagnostics, feature flags                    |
+--------------------------------------+-----------------------------------------------+
```

## Scraper / Rendered Runtime

Purpose: capture difficult modern websites and convert them into a gallery/reference system.

```text
+--------------------------------------------------------------------------------------+
| Rendered Runtime Capture                                                              |
| Capture | Gallery                                                                     |
+--------------------------------------+-----------------------------------------------+
| URL Input                             | Capture Summary                              |
| source URL                            | status, phase, progress                       |
| mode: single/full                     | pages, assets, total size                     |
| max pages / depth                     | export zip/json/csv                           |
| export formats                        | stop / open gallery                           |
| [ Start Capture ]                     |                                               |
+--------------------------------------+-----------------------------------------------+
| Phase Timeline                                                                         |
| crawling -> rendering -> assets -> observing -> packaging -> done                      |
+--------------------------------------------------------------------------------------+
```

Gallery mode:

```text
+--------------------------------------------------------------------------------------+
| Gallery Index                                                                         |
+-------------------------------+------------------------------------------------------+
| Captured Sites           | Selected Gallery                                      |
| title, source, date      | source URL, framework, contacts, hosting              |
| metrics                  | automation, confidence, assets, motion                 |
+-------------------------------+------------------------------------------------------+
| Actual Websites | Case Studies | Icons | Animations | Motion Protocols | Assets        |
+--------------------------------------------------------------------------------------+
```

Scraper states:

- idle
- crawling
- rendering
- assets
- observing
- packaging
- done
- failed
- stopped

Important boundaries:

- public/rendered capture only
- no private-account bypass
- rights review before public reuse
- screenshot-derived assets are visual reference unless rights are confirmed

## Generated Preview / Forge Preview

Purpose: test UI components and generated app surfaces.

```text
+--------------------------------------------------------------------------------------+
| Forge Preview                                                                         |
+--------------------------------------------------------------------------------------+
| Component Gallery                                                                      |
| Mission control | Timeline | Approval card | Activity feed | Metric pills             |
+--------------------------------------------------------------------------------------+
| Generated App Frame                                                                    |
| responsive preview, inspect mode foundation, iframe sandbox                            |
+--------------------------------------------------------------------------------------+
```

Use this route as a staging surface, not as primary product navigation.

## Local Desktop / Control App

Purpose: manage the stack without loose terminal windows.

```text
+--------------------------------------------------------------------------------------+
| AgentOS Control                                                                       |
+--------------------------------------+-----------------------------------------------+
| Stack Controls                        | Logs                                          |
| Start stack                           | API output                                    |
| Stop stack                            | UI output                                     |
| Restart stack                         | tunnel/cloudflared output                     |
| Health check                          | scraper/job output                            |
+--------------------------------------+-----------------------------------------------+
| URLs                                                                                  |
| localhost UI | localhost API | flous.dev | api.flous.dev                              |
+--------------------------------------------------------------------------------------+
```

Agent coordination rules:

- one stack owner
- one agent edits a file at a time
- shared locks for active file ownership
- handoff notes after each slice

## Data Model Surfaces

The UI should expose these concepts consistently:

- Mission
- Run
- Approval
- Agent
- Session
- Routine
- Archive item
- Wiki article
- Loadout item
- Provider
- Scrape job
- Gallery record
- Trusted device
- Operator session

## Status Language

Use clear status labels:

- Ready
- Queued
- Running
- Awaiting Approval
- Paused
- Completed
- Failed
- Blocked
- Offline
- Mock Mode
- Needs Config

Avoid theatrical labels like:

- armed
- in theater
- redline
- classified
- killboard
- threat matrix

## Mobile Wireframe

```text
+--------------------------------------+
| AgentOS                  Search User |
| Dashboard | Missions | More          |
+--------------------------------------+
| API | Worker | Queue | Approvals     |
+--------------------------------------+
| Route Header                         |
+--------------------------------------+
| Primary Card                         |
+--------------------------------------+
| Secondary Card                       |
+--------------------------------------+
| Timeline / List                      |
+--------------------------------------+
| Inspector / Details                  |
+--------------------------------------+
| Quick Actions                        |
+--------------------------------------+
```

Mobile rules:

- one primary action per viewport
- controls stay reachable
- cards have fixed responsive dimensions
- tables become list rows
- inspector becomes expandable detail

## Cross-Route Inspector Rail

```text
+-------------------------------+
| Inspector                     |
+-------------------------------+
| Selected item title           |
| status / risk / timestamp     |
| linked mission/run/agent      |
| compact logs or preview       |
| next action                   |
| artifacts / copy / export     |
+-------------------------------+
```

Inspector variants:

- run inspector
- approval inspector
- agent inspector
- archive preview
- wiki article metadata
- provider settings
- scrape gallery detail

## Empty State Pattern

```text
+--------------------------------------------------+
| No active [thing]                                |
| Short plain explanation.                         |
| [ Primary action ] [ Secondary action ]          |
| Optional setup checklist                         |
+--------------------------------------------------+
```

Examples:

- No active mission -> Create Mission
- No pending approvals -> Open Missions
- No archive items -> Save a run summary
- No wiki articles -> Sync Memory
- No captures -> Start Capture
- No providers -> Configure Loadout

## Error State Pattern

```text
+--------------------------------------------------+
| Could not load [surface]                         |
| What failed in plain language.                   |
| Last known state if available.                   |
| [ Retry ] [ Open Logs ] [ Use Local Mode ]       |
+--------------------------------------------------+
```

Error states should link to Blackbox when logs exist.

## Accessibility And Usability

- Command palette is keyboard accessible.
- Approval buttons have clear labels and disabled states.
- Health strip uses text plus color, not color alone.
- Cards should not reflow on hover.
- Logs need copy controls and readable monospace.
- Tables need responsive list alternatives.
- Motion should respect reduced-motion preferences.

## Agent Handoff Map

Recommended ownership slices:

```text
Codex:
- runtime/API contracts
- scraper service
- store/repository behavior
- validation and release checks

Cursor/Claude:
- route UI polish
- dashboard layout
- component states
- visual implementation from wireframes

Gemini:
- long-form docs
- copy variants
- prompt packs
- QA checklists
```

Shared rule:

- no agent edits a locked file without handoff
- no agent changes naming tone without updating `docs/design/DESIGN.md`
- no agent introduces hidden autonomous execution without approval gates and audit events

## Completion Checklist

AgentOS feels comprehensively wireframed when:

- every route has a first task
- every route has empty/loading/error/active states
- every risky action has an approval or step-up path
- every run can be traced through Blackbox
- memory has both archive and wiki surfaces
- scraper has capture and gallery surfaces
- settings owns identity, device trust, runtime mode, and provider config
- mobile preserves the same workflows
- naming stays calm and product-facing

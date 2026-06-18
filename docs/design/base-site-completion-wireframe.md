# AgentOS Base Site Completion Wireframe

## Purpose

This wireframe defines the ideal "base site complete" shape for the current AgentOS Command Center checkout.

It is grounded in the live route structure:

- `/`
- `/dashboard`
- `/missions`
- `/control-gate`
- `/blackbox`
- `/operators`
- `/routines`
- `/archive`
- `/wiki`
- `/loadout`
- `/settings`
- `/scraper`

The goal is not a marketing site. The goal is a calm, mission-first operator surface that feels complete enough to demo, use daily, and extend safely.

## Completion Standard

For the base site to feel relatively complete, every primary route should satisfy these conditions:

- It has a clear first task.
- It has a clear empty state.
- It has a clear active state.
- It has a clear navigation relationship to the rest of the app.
- It exposes the right amount of detail without forcing page hops for routine work.
- Mobile keeps the same workflows, even if some panels collapse or stack.

## Site Frame

```text
+--------------------------------------------------------------------------------------+
| AgentOS                              Search / Command Palette                   User  |
| Dashboard | Missions | Control Gate | Blackbox | Agents | More                     |
+--------------------------------------------------------------------------------------+
| Health strip: API | Worker | Queue | Approvals | Memory Sync | Provider | Mode      |
+--------------------------------------------------------------------------------------+
|                                                                                        |
| Main workspace                                                                         |
|                                                                                        |
| Primary canvas for the selected route                                                  |
|                                                                                        |
|                                               Inspector rail / chat dock / context     |
|                                                                                        |
+--------------------------------------------------------------------------------------+
```

Base shell rules:

- Top navigation is always visible.
- Health strip stays compact and scannable.
- The command palette is a first-class control, not a novelty.
- A right-side context rail exists on desktop for run details, recent activity, or help.
- On mobile, the right rail becomes a bottom sheet or stacked section.

## Screen 1: Dashboard Home

Purpose: orient the operator in under ten seconds.

```text
+--------------------------------------------------------------------------------------+
| DASHBOARD                                                                            |
| "Track live runs, approvals, memory, and local runtime posture from one surface."    |
+----------------------------------+-----------------------------+---------------------+
| Active mission                   | Pending approvals           | Runtime posture     |
| title, objective, command        | count + highest risk        | API / worker / mode |
| progress + current phase         | approve now CTA             | provider + queue    |
+----------------------------------+-----------------------------+---------------------+
| Mission timeline / activity stream                                                     |
| recent run events, planning, tool execution, gate pauses, completion                  |
+--------------------------------------------------------------------------------------+
| Executed agents / current presences              | Inspector                          |
| who is active, status, role, confidence          | selected run, route, output, CTA  |
+--------------------------------------------------------------------------------------+
| Quick actions                                                                         |
| Start mission | Open approvals | Run tests | Sync memory | Review archive             |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- There is one obvious "what is happening right now" card.
- Approval backlog is visible without opening another page.
- The run inspector is useful enough to avoid a page switch for most checks.

## Screen 2: Missions

Purpose: compose, launch, and monitor one-off work.

```text
+--------------------------------------------------------------------------------------+
| MISSIONS                                                                             |
+-----------------------------------------+--------------------------------------------+
| Compose mission                         | Run history                                |
| title                                   | recent missions                            |
| objective                               | statuses                                   |
| prompt                                  | last command                               |
| command                                 | rerun / inspect                            |
| sandbox level                           |                                            |
| provider + model                        |                                            |
| create issue toggle                     |                                            |
| [ Create and run ]                      |                                            |
+-----------------------------------------+--------------------------------------------+
| Active run inspector                                                                 |
| route, logs, approval linkage, quick actions, memory queue                          |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- Mission creation does not require hidden settings.
- Recent runs are readable at a glance.
- The compose form and run inspector coexist without crowding each other.

## Screen 3: Control Gate

Purpose: handle approvals with confidence.

```text
+--------------------------------------------------------------------------------------+
| CONTROL GATE                                                                         |
+----------------------------------+---------------------------------------------------+
| Approval queue                   | Selected approval                                 |
| pending items by risk            | requesting agent                                 |
| grouped by mission               | requested action                                 |
| bulk approve once                | why it needs approval                            |
| filters: all / repo / net / env  | affected scope                                   |
|                                  | command preview                                  |
|                                  | [ Allow once ] [ Allow for mission ] [ Deny ]    |
+----------------------------------+---------------------------------------------------+
| Gate results / completion requirements                                                |
| QA, security, release prep, failure summaries                                        |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- Approvals can be triaged without fear of losing context.
- The selected approval explains the risk in plain language.
- Bulk and single-item flows both feel intentional.

## Screen 4: Blackbox

Purpose: answer "what happened?" fast.

```text
+--------------------------------------------------------------------------------------+
| BLACKBOX                                                                             |
+--------------------------------------------------------------------------------------+
| Search [ approval / run id / command / agent / error ]   Filter [all|stdout|stderr] |
+-----------------------------------------+--------------------------------------------+
| Live run logs                            | Audit trail                                |
| streaming execution output               | operator actions                           |
| plan / exec / stdout / stderr / result   | approvals, denials, route decisions        |
| timestamps                               | searchable event list                      |
+-----------------------------------------+--------------------------------------------+
| Gate diagnostics / failures                                                             |
| why a run stopped, what gate failed, what the operator needs to do next                |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- Search covers both logs and audit history.
- Users can move from symptom to action without guessing.
- Failure states are more readable than success states.

## Screen 5: Agents

Purpose: show the active cast and who did what.

```text
+--------------------------------------------------------------------------------------+
| AGENTS                                                                               |
+----------------------------------+---------------------------------------------------+
| Agent roster                     | Selected agent                                   |
| avatar, role, current state      | role, skills, last action                       |
| active / idle / blocked          | mission involvement                             |
| current task                     | recent outputs                                  |
|                                  | route participation                             |
+----------------------------------+---------------------------------------------------+
| Sessions                                                                              |
| active sessions, paused sessions, resume / pause controls                             |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- The page answers both "who exists?" and "who is currently contributing?"
- Session controls are adjacent to the roster instead of buried elsewhere.

## Screen 6: Routines

Purpose: save repeatable work.

```text
+--------------------------------------------------------------------------------------+
| ROUTINES                                                                             |
+-----------------------------------------+--------------------------------------------+
| Create routine                          | Existing routines                           |
| title                                   | title + frequency                           |
| objective                               | next run posture                            |
| prompt                                  | enabled / disabled                          |
| command                                 | run now / pause / resume                    |
| frequency                               |                                            |
| provider + model                        |                                            |
| [ Save routine ]                        |                                            |
+-----------------------------------------+--------------------------------------------+
```

Must feel complete when:

- Manual and scheduled work feel like the same model.
- Operators can understand routine risk without opening a detail page.

## Screen 7: Archive

Purpose: preserve outputs worth keeping.

```text
+--------------------------------------------------------------------------------------+
| ARCHIVE                                                                              |
+--------------------------------------------------------------------------------------+
| Search [ title / mission / summary ]   Filter [all|brief|result|note|memory]         |
+--------------------------------------------------------------------------------------+
| Archive list                                                                          |
| title | type | linked mission | created at | short content preview                    |
+--------------------------------------------------------------------------------------+
| Detail preview                                                                        |
| full saved summary, linked run, related quick actions, export/copy/share hooks later  |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- The archive reads like usable memory, not a dump.
- Operators can distinguish permanent notes from transient run output.

## Screen 8: Wiki

Purpose: browse curated project memory.

```text
+--------------------------------------------------------------------------------------+
| MEMORY WIKI                                                                          |
+----------------------------------+---------------------------------------------------+
| Article tree / search            | Article view                                      |
| product                          | title                                            |
| agents                           | summary                                          |
| sessions                         | content                                          |
| areas                            | backlinks / related docs                         |
| flows                            | source hints                                     |
+----------------------------------+---------------------------------------------------+
| Suggested reads / recently changed                                                    |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- Search and browse are equally good entry points.
- Session digests, product briefs, and area docs feel like one knowledge system.

## Screen 9: Loadout

Purpose: show tool and provider posture.

```text
+--------------------------------------------------------------------------------------+
| LOADOUT                                                                              |
+--------------------------------------------------------------------------------------+
| Integrations / providers                                                               |
| Ollama | Mock | Discord | Gateway | GitHub | Cursor | Scraper                         |
| status chips, short description, local readiness, missing config states               |
+--------------------------------------------------------------------------------------+
| Policy notes                                                                          |
| what is auto-allowed, approval-required, denied                                       |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- Missing setup is obvious but not noisy.
- The page explains current capability, not hypothetical future capability.

## Screen 10: Settings

Purpose: runtime posture, help, and safe defaults.

```text
+--------------------------------------------------------------------------------------+
| SETTINGS                                                                             |
+-----------------------------------------+--------------------------------------------+
| Runtime mode                            | Operator help                               |
| system / providers toggle               | FAQ                                         |
| API / worker / gateway status           | local-first explanation                     |
| budgets                                 | approval model                              |
| default provider                        | command palette help                        |
+-----------------------------------------+--------------------------------------------+
| Policy snapshot                                                                       |
| auto-allowed | approval required | denied                                             |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- The app explains itself without becoming documentation-heavy.
- The settings page is operational, not decorative.

## Screen 11: Scraper

Purpose: fetch and inspect source content without leaving the operator shell.

```text
+--------------------------------------------------------------------------------------+
| SCRAPER                                                                              |
+-----------------------------------------+--------------------------------------------+
| New scrape job                          | Saved jobs / recent outputs                 |
| URL                                     | last status                                 |
| scope / depth                           | extracted assets                            |
| same-origin policy note                 | inspect output                              |
| [ Start scrape ]                        | rerun / archive                             |
+-----------------------------------------+--------------------------------------------+
| Extract preview                                                                        |
| text, links, files, warnings                                                          |
+--------------------------------------------------------------------------------------+
```

Must feel complete when:

- A first-time operator can understand what will be scraped and why.
- Output is inspectable without falling into raw JSON everywhere.

## Mobile Wireframe

```text
+-------------------------------------------+
| AgentOS            Menu      Command      |
+-------------------------------------------+
| Health strip (scrollable chips)           |
+-------------------------------------------+
| Active mission                            |
| progress, phase, approvals                |
+-------------------------------------------+
| Quick actions                             |
+-------------------------------------------+
| Section body                              |
| stacked cards                             |
+-------------------------------------------+
| Bottom drawer                             |
| Inspector / chat / selected detail        |
+-------------------------------------------+
```

Mobile rules:

- Navigation collapses into menu plus command button.
- Inspector content moves into a bottom drawer.
- Mission compose forms become single-column.
- Approval actions stay thumb-friendly and fixed near the selected item.

## Route Priority

Base site completion should prioritize these surfaces in order:

1. Dashboard
2. Missions
3. Control Gate
4. Blackbox
5. Wiki
6. Agents
7. Archive
8. Loadout
9. Settings
10. Routines
11. Scraper

Reason:

- The first four establish the core operator loop.
- Wiki and Agents make the product explainable and inspectable.
- Archive, Loadout, and Settings make it trustworthy.
- Routines and Scraper become high-value extensions once the main loop feels solid.

## Completion Matrix

| Surface | Must have for base completion | Nice later |
| --- | --- | --- |
| Dashboard | live mission, approvals, health, activity, quick actions | richer visualizations |
| Missions | compose, run history, inspector | presets, templates, diffing |
| Control Gate | queue, detail, single/bulk decisions | saved approval views |
| Blackbox | logs, audit, search, failure diagnosis | trace graph |
| Agents | roster, presence, sessions | richer per-agent journals |
| Routines | create, list, run, pause | cadence analytics |
| Archive | list, filter, preview | exports, tags |
| Wiki | browse, search, render | graph view |
| Loadout | provider/integration status | setup actions |
| Settings | runtime posture, policy, help | preferences |
| Scraper | create job, view output | pipelines |

## Build Notes

- Keep the Forge shell and command palette as the visual constant.
- Resist turning every route into a dashboard of tiny cards. Each page needs one dominant job.
- Prefer mission-first and operator-first language over platform-marketing language.
- The dashboard should summarize; the route pages should let the operator act.
- Empty states should suggest the next safe action, not explain the entire product.

## Ideal Outcome

When the base site is relatively complete, a new operator should be able to:

1. Land on the dashboard and understand system posture.
2. Create a mission and run it.
3. Approve or deny gated work confidently.
4. Diagnose outcomes in Blackbox.
5. Browse saved memory and archive output.
6. Understand the current runtime without needing external docs.

# AgentOS Dashboard Wireframe

## App Shell

```text
+--------------------------------------------------------------------------------------+
| AgentOS                              Search / Command Palette                   User  |
| Dashboard | Missions | Approvals | Activity | Agents | Archive | Wiki | Settings     |
+--------------------------------------------------------------------------------------+
| API Ready | Worker Ready | Queue 3 | Approvals 2 | Memory Synced | Local Mode        |
+--------------------------------------------------------------------------------------+
|                                                                                      |
| Dashboard                                                                            |
| Track live runs, approvals, memory, and local runtime posture from one surface.      |
|                                                                                      |
| +----------------------------+ +--------------------------+ +----------------------+ |
| | Active Mission             | | Pending Approvals        | | Runtime Posture      | |
| | Objective                  | | 2 waiting                | | API / Worker / Queue | |
| | Current phase              | | highest risk + reason    | | Provider / Mode      | |
| | Progress                   | | Allow once / Review      | | Memory / Storage     | |
| +----------------------------+ +--------------------------+ +----------------------+ |
|                                                                                      |
| +--------------------------------------------------------+ +-----------------------+ |
| | Activity Timeline                                      | | Inspector             | |
| | run events, tool calls, approvals, test output         | | selected run detail   | |
| | grouped by mission and timestamp                       | | route, logs, outputs  | |
| +--------------------------------------------------------+ +-----------------------+ |
|                                                                                      |
| +----------------------------+ +--------------------------+ +----------------------+ |
| | Agent Sessions            | | Quick Actions            | | Recent Archive       | |
| | active / idle / blocked   | | Start mission            | | saved outputs        | |
| | current role and task     | | Open approvals           | | linked run summaries | |
| +----------------------------+ +--------------------------+ +----------------------+ |
|                                                                                      |
+--------------------------------------------------------------------------------------+
```

## Dashboard Cards

### Active Mission

Shows the current mission title, objective, current phase, progress, running agents, and next gate.

Actions:

- Pause
- Resume
- Inspect
- Open Logs

### Pending Approvals

Shows approval count, highest-risk item, request reason, affected scope, and command preview.

Actions:

- Allow Once
- Allow For Mission
- Deny
- Review All

### Runtime Posture

Shows system health without drama.

Signals:

- API
- Worker
- Queue
- Provider
- Memory Sync
- Local/Mock Mode

### Activity Timeline

Shows a readable audit stream:

- planning
- tool execution
- stdout/stderr summary
- approval pauses
- test results
- completion notes

### Inspector

Desktop: right rail.

Mobile: collapsible section or bottom sheet.

Shows selected run, approval, agent, or archive item.

## Mobile Layout

```text
+--------------------------------------+
| AgentOS                  Search User |
| Dashboard | Missions | More          |
+--------------------------------------+
| API | Worker | Queue | Approvals     |
+--------------------------------------+
| Active Mission                       |
+--------------------------------------+
| Pending Approvals                    |
+--------------------------------------+
| Runtime Posture                      |
+--------------------------------------+
| Activity Timeline                    |
+--------------------------------------+
| Agent Sessions                       |
+--------------------------------------+
| Inspector / Details                  |
+--------------------------------------+
```

## Empty States

Dashboard should still feel useful with no active mission:

- Active Mission becomes `No Active Mission`
- CTA: `Create Mission`
- Approvals shows `No Pending Approvals`
- Timeline shows recent completed work or setup checklist
- Runtime Posture remains visible

## Visual Notes

Use the included scraped assets and screenshots only for inspiration:

- premium spacing
- polished section rhythm
- motion references
- image density
- card hierarchy

The final dashboard should use AgentOS product language, not the scraped site's brand.

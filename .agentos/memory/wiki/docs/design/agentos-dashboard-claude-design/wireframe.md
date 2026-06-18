---
slug: docs/design/agentos-dashboard-claude-design/wireframe
title: Wireframe
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Wireframe

Source: `docs/design/agentos-dashboard-claude-design/wireframe.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Dashboard Wireframe

## App Shell

[code block omitted]

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

[code block omitted]

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

## Related

- [[index]]
- [[areas/repo-layout]]

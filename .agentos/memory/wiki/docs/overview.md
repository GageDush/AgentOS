---
slug: docs/overview
title: Overview
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Overview

Source: `docs/overview.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Overview

AgentOS Local is the canonical product: a host-ready local AI dev operations hub with SQL-backed local persistence, repository-backed runtime paths, transaction-bundled mission state transitions, durable missions, approvals, audit trails, archive memory, routing decisions, conversational control, and quick actions.

The intended operator loop is:

1. Open the command center.
2. Create or inspect a mission.
3. Let AgentOS route deterministically through installed `.agentos` profiles.
4. Pause in Control Gate when a risky action requires approval.
5. Resume safe execution through the local gateway and worker spine, with runtime-critical transitions persisted through repository transaction bundles.
6. Review logs, archive output, routing decisions, and quick actions in one place.

The Office Demo remains preserved only for archival/demo purposes and should not drive product decisions.

## Related

- [[index]]
- [[areas/repo-layout]]

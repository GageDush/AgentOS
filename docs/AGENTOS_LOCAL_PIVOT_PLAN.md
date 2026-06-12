# AgentOS Local Pivot Plan

## Audit Summary

Reusable systems:
- `apps/api`: durable control-layer routes, provider access, approvals, audit, memory, usage
- `apps/gateway`: natural home for safe command execution
- `apps/worker`: local worker spine for claiming and processing queued runs
- `packages/shared`: source of truth for mission, run, approval, memory, usage types
- `packages/memory`: reusable archive creation and search
- `packages/orchestrator`: deterministic routing and conversational intent parsing
- `packages/agents`: installed `.agentos` registry and profile loading
- `packages/persistence`: host-ready durable state adapter plus repository/query layer
- `packages/runtime`: worker/runtime spine shared by API and worker
- `packages/tools`: reusable loadout/tool metadata
- `packages/ui`: reusable shell styling hook point
- `packages/config`: reusable env and port config
- `packages/sandbox`: reusable command policy and permission levels

Phaser and demo-only surfaces:
- `apps/command-center/src/game/*`
- `apps/command-center/src/components/CommandCenter.tsx`
- `packages/game-schema/*`
- `apps/command-center/public/assets/office-master.png`
- executive office demo art wired specifically to the Phaser experience

## Migration Direction

1. Keep the current office demo intact behind `/demo/office`.
2. Replace `/` with a mission-first command center UI.
3. Expand the shared model for:
   - missions
   - mission runs
   - run logs
   - routines
   - sessions
   - loadout
   - sandbox permission levels
4. Route all command execution through a local policy-aware gateway.
5. Route all risky actions through Control Gate approval records and audit trail.
6. Add durable chat threads, chat messages, quick actions, routing decisions, and provider usage.
7. Preserve mock-first behavior while allowing Ollama-backed prompt work.

## First Vertical Slice

Mission flow:
1. Create mission
2. Choose operator
3. Generate operator plan
4. Pause for Control Gate if the command or sandbox level requires it
5. Continue execution after approval
6. Save run output to Archive
7. Display run history and live logs

## Deferred For Later

- Real scheduling engine for routines
- Hosted Postgres adapter behind the current SQL persistence seam
- Full runtime migration of lower-churn admin/dev flows away from snapshot-style writes
- Rich session resume orchestration
- Real external integrations beyond local-safe stubs
- Removal of the deprecated office demo after the new shell is stable

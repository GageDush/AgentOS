# AgentOS Hosted Execution Notes

AgentOS Local is still the active implementation, but this note captures what remains before a real hosted or multi-node deployment should be considered credible.

## Worker Leasing

- SQLite currently protects local worker claims with short transactions.
- Hosted Postgres should move claim logic to row-level transactional leasing.
- Preferred hosted pattern:
  - `SELECT ... FOR UPDATE SKIP LOCKED`
  - lease expiry timestamp
  - claim owner / worker identity
  - heartbeat or renewal path for long jobs

## Run Claiming

- Local claims support:
  - queued runs
  - expired planning/running leases
  - max attempt limits
- Hosted claims still need:
  - stronger fairness policy
  - explicit ordering guarantees
  - lease extension semantics
  - better conflict handling across multiple workers

## Retry Ownership

- Local retry flow creates a new run and expires stale quick actions.
- Hosted mode still needs:
  - retry ownership rules
  - retry idempotency keying
  - protection against duplicate retries from multiple operators/workers

## Idempotency

Repository bundles reduce local drift, but hosted execution still needs explicit idempotency for:

- approval decision processing
- retry creation
- run completion callback handling
- archive write dedupe
- usage/provider event dedupe

Recommended hosted additions:

- idempotency keys on critical state transitions
- unique constraints where practical
- correlation-id tracing from API through worker and gateway

## Migration Strategy

Current local schema is SQLite-backed and repository-shaped.

Hosted migration path should be:

1. keep repository interfaces stable
2. implement Postgres adapter behind the same contract
3. move schema creation to migration-managed SQL or Drizzle migrations
4. verify transaction bundles behave identically under Postgres
5. add lease/claim tests for multi-worker concurrency

## Connection And Environment Requirements

Hosted mode will eventually need:

- Postgres connection URL
- environment selection for local/staging/production
- worker identity configuration
- gateway deployment address
- session/auth configuration for non-default operators
- secrets management for any real model or integration credentials

## Deployment Assumptions

Current code still assumes:

- one active local workspace by default
- one default local operator exists
- safe local gateway execution is nearby
- no cloud model calls are required

Hosted assumptions that still need to be formalized:

- tenant/workspace isolation strategy
- operator authentication model
- network segmentation between API, worker, and gateway
- external secrets storage
- rollout/rollback process for schema and worker versions

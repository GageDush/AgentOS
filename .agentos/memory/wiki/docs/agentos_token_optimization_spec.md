---
slug: docs/agentos_token_optimization_spec
title: AGENTOS TOKEN OPTIMIZATION SPEC
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# AGENTOS TOKEN OPTIMIZATION SPEC

Source: `docs/AGENTOS_TOKEN_OPTIMIZATION_SPEC.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Token Optimization + Conditional Agent Pipeline

**Purpose:** Implement a subscription-aware, token-efficient AgentOS control layer that routes user tasks through the minimum necessary agents, model lanes, context, and verification gates.

**Primary outcome:** AgentOS should stop treating every request as a full multi-agent workflow. It should classify the task, minimize context, pick the cheapest adequate model/subscription lane, delegate only when useful, verify objectively, and return a compact final result.

**Token rule:** Do not broadcast the full user prompt, repo history, or conversation transcript to every agent. Convert requests into structured task envelopes and pass each agent only the fields it needs.

## 1. Non-goals

Do **not** implement the visual office / Phaser dashboard in this phase.

Do **not** implement a huge autonomous swarm that runs every agent on every prompt.

Do **not** make paid API usage the default path.

Do **not** let reviewer/security agents freely modify code. They should be read-only unless explicitly promoted by the Admin Agent.

---

## 2. Target File Structure

Adapt paths to the existing repo, but prefer this structure if no convention exists.

[code block omitted]

If this is a docs-only repo, create the `.agentos/` files and a `docs/agentos/token-optimization.mdx` summary instead of TypeScript runtime files.

---

## 3. Core Concepts

### 3.1 Admin Agent

The Admin Agent is the control plane. It receives user requests and owns final user-facing output.

Responsibilities:

- Create the initial task envelope.
- Decide whether the request is answer-only, research, repo-analysis, code-change, review, security-sensitive, release, or maintenance.
- Send the task to the classifier/context minimizer.
- Enforce commit policy.
- Return a concise final result.

The Admin Agent should **not** perform heavy implementation, full repo scanning, or final self-review.

### 3.2 Task Classifier + Context Minimizer

This is the first token-saving layer.

Responsibilities:

- Convert raw user input into structured task metadata.
- Determine task type, complexity, risk level, and required context.
- Retrieve only relevant repo/docs/memory.
- Build a compact task envelope.

Use deterministic commands, cached memory, grep/search, and local models before using any premium mo

## Related

- [[index]]
- [[areas/repo-layout]]

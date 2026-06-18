---
slug: areas/diagrams/agent-pipeline
title: "Diagram: Conditional agent pipeline"
tags: [architecture, mermaid, agents, diagram]
valid_from: 2026-06-13
---
# Conditional agent pipeline

From `.agentos/agent-registry.json` — gates are optional (`?`).

```mermaid
flowchart TD
    admin["admin-agent"] --> classifier["task-classifier"]
    classifier --> ctxGate{"Repo context?"}
    ctxGate -->|yes| ctx["context-minimizer"]
    ctxGate -->|no| quota["quota-steward"]
    ctx --> quota
    quota --> planGate{"Complex task?"}
    planGate -->|yes| planner["planner-partitioner"]
    planGate -->|no| spec["specialists"]
    planner --> spec
    spec --> qaGate{"QA gate?"}
    qaGate -->|yes| qa["qa-agent"]
    qaGate -->|no| secGate{"Security?"}
    qa --> secGate
    secGate -->|yes| sec["security-auditor"]
    secGate -->|no| revGate{"Code review?"}
    sec --> revGate
    revGate -->|yes| rev["code-reviewer"]
    revGate -->|no| relGate{"Release?"}
    rev --> relGate
    relGate -->|yes| rel["release-manager"]
    relGate -->|no| synth["systems-synthesizer"]
    rel --> synth
    synth --> mem["memory-curator"]
    mem --> adminOut["admin-agent return"]
```

## Specialist routing (tier-0)

| Signal | Primary agent |
|--------|---------------|
| answer_only | admin-agent |
| research | issue-intake-researcher |
| frontend | frontend-ui-agent |
| backend | backend-service-agent |
| database | database-migration-agent |
| integration | integration-broker |
| repo analysis | repo-cartographer |
| default code | code-implementer |

Core roster: 17 agents in registry + 4 addons. See [[flows/pipeline]].

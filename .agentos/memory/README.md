# AgentOS repo memory cache

Deterministic context files used by `context-minimizer` before LLM retrieval.

## Files

| File | Purpose |
| --- | --- |
| `repo-map.md` | High-level app/package layout |
| `test-commands.md` | Canonical verification commands |
| `dependency-graph.md` | Workspace package relationships |
| `code-ownership-map.md` | Area → owner hints |
| `risk-areas.md` | Sensitive paths and policies |

Populate these during downtime or via `repo-cartographer`. The context minimizer reads only what exists and keeps packets compact.

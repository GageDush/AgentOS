# AgentOS repo memory

## Memory wiki (preferred)

Linked articles live under **`wiki/`** — start at [[wiki/index.md]].

- Browse via API: `GET /memory/wiki`, `GET /memory/wiki/article?slug=flows/test-commands`
- Migrate legacy flat files: `pnpm memory:migrate-wiki`

## Legacy flat files (deprecated)

These dated-append files remain for backward compatibility until PR2 moves all writes to the wiki:

| File | Wiki successor |
| --- | --- |
| `test-commands.md` | `wiki/flows/test-commands.md` |
| `risk-areas.md` | `wiki/areas/risk-areas.md` |
| `code-ownership-map.md` | `wiki/areas/code-ownership.md` |

The context minimizer still reads legacy files when `FEATURE_MEMORY_WIKI=false`.

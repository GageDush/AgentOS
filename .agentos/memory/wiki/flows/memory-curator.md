---
slug: flows/memory-curator
title: Memory curator flow
tags: [memory, curation]
archived: false
---

# Memory curator flow

After specialist agents complete:

1. Build `MemoryUpdateEnvelope` from agent reports
2. High confidence → auto-merge (legacy flat files; wiki merge in PR2)
3. Lower confidence → operator queue in Forge
4. Approved updates land in [[index|wiki]] articles with `[[wikilinks]]`

## Related

- [[packages/agents]]
- [[areas/repo-layout]]

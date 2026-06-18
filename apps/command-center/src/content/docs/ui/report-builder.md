# Report builder

Generates **markdown, PDF, or HTML** reports from evidence and graph selections.

## Inputs

- Selected evidence items
- Timeline slice
- Graph export (nodes/edges)
- Analyst summary text
- Report template ID

## Pipeline

```txt
Evidence + entities → Redactor (mode) → Template render → Export file
```

## Service

`report-service` — [Backend services](/docs/platform/backend-services).

## Templates

- Verification brief (media)
- Domain exposure summary
- Timeline appendix with footnotes
- Evidence pack (ZIP + index markdown)

## Table

`reports` — [Data model](/docs/platform/data-model).

## Optional gate

Export approval workflow in V3 — [Component roadmap](/docs/platform/roadmap).

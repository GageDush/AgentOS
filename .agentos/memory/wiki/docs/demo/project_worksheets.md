---
slug: docs/demo/project_worksheets
title: PROJECT WORKSHEETS
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# PROJECT WORKSHEETS

Source: `docs/demo/PROJECT_WORKSHEETS.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS — Project Worksheets

Last updated: 2026-06-12

Nine individual projects derived from the developer-first work clusters. Each project includes discussion, a scope worksheet (copy/paste replies), a revised gameplan slot, and a **10-step plan with gate criteria** — do not advance to the next step until the current step’s success parameters are met.

**How to use**

1. **All projects at once:** fill out `PROJECT_SCOPING_FORM.md` and paste the form body back.
2. **One project:** copy that project’s **Scope worksheet** block below.
3. Revise the **Revised scope** and **10-step gameplan** sections with your answers applied.
4. Execute step-by-step; check off success parameters before advancing.

**Recommended order:** P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. P9 only if you want the greenfield demo lane.

----|-------------|-------------|
| Implementer modes | _[paste]_ | _[e.g. gateway primary, Cursor opt-in via env]_ |
| Tools | _[paste]_ | _[e.g. Read/Grep/Shell only; no network curl]_ |
| Autonomy | _[paste]_ | _[e.g. max 8 tool calls, 2 fix-verify retries]_ |
| Safety | _[paste]_ | _[e.g. gate on git push, chmod, rm]_ |
| Demo success | _[paste]_ | _[e.g. mission fixes failing test in packages/shared]_ |

## 10-step gameplan

| Step | Action | Success parameters (all required to advance) |
|------|--------|-----------------------------------------------|
| **1** | Audit current implementer path; document mock vs real gaps in a short note | Note exists; lists dispatch modes, patch-apply behavior, and `FEATURE_TOOL_EXECUTION` touchpoints |
| **2** | Define tool contract (`ToolRequest` / `ToolResult`) in `packages/shared` | Types exported; unit test for serialization; no runtime wiring yet |
| **3** | Implement Read + Grep via gateway (or dedicated tools endpoint) with repo-root guard | Tests pass; attempt to read outside repo root fails with audited error |
| **4** | Implement Shell broker through gateway `assessCommandPolicy` + lease ID in audit | Denied command blocked; allowed command returns stdout/stderr in audit event |
| **5** | Wire tools into implementer dispatch behind `FEATURE_TOOL_EXECUTION` | With flag off, behavior unchanged; with flag on, implementer step invokes at least one tool |
| **6** | Connect tool outputs to LLM loop (envelope update, compact summaries) | Run log shows tool calls; no full transcript d

## Related

- [[index]]
- [[areas/repo-layout]]

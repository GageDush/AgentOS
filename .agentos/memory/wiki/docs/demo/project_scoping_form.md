---
slug: docs/demo/project_scoping_form
title: PROJECT SCOPING FORM
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# PROJECT SCOPING FORM

Source: `docs/demo/PROJECT_SCOPING_FORM.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS — All-Projects Scoping Form

## Recommended: use the web form

Too many questions for one markdown block? Use the **multi-step wizard** (auto-save, one project per screen):

[code block omitted]

Or serve it: `pnpm scoping:form:serve` → http://localhost:3456

To put it on a public URL: drag folder `docs/demo/scoping-form` to [Netlify Drop](https://app.netlify.com/drop).

Details: `docs/demo/scoping-form/README.md`

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- COPY FROM HERE ↓ (FORM BODY)                                      -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

[code block omitted]

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- COPY TO HERE ↑ (FORM BODY)                                        -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

---

## Quick priority matrix (optional — fill after main form)

| Project | Include? | Priority 1–9 | Target date |
|---------|----------|--------------|-------------|
| P1 Implementer | | | |
| P2 Quality gates | | | |
| P3 Release | | | |
| P4 Live UX | | | |
| P5 Discord CI | | | |
| P6 Hosted scale | | | |
| P7 Memory | | | |
| P8 Ship | | | |
| P9 App intake | | | |

---

## After you submit

Paste the filled **FORM BODY** in chat. You will receive:

1. Revised scope table per included project  
2. Adjusted 10-step gameplans from `PROJECT_WORKSHEETS.md`  
3. Recommended MR order and dependencies

## Related

- [[index]]
- [[areas/repo-layout]]

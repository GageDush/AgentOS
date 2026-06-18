# Labs overview

Hands-on builds that exercise the component library. Each lab produces a working artifact, not a slide deck.

## Lab 1: Build a source adapter

### Objective

Create a reusable adapter around one public source.

### Requirements

- Input validation
- Collection + raw artifact storage
- Parsing + normalization
- Error handling + source metadata
- Evidence output hook

### Deliverable

Working adapter + JSON test fixture.

---

## Lab 2: Build an evidence vault

### Objective

Store URLs, screenshots, raw responses, hashes, and analyst notes.

### Requirements

- `evidence_items` table
- Raw artifact filesystem or object store
- Source citations on every row
- Screenshot upload path
- Markdown export function

### Deliverable

Local evidence dashboard — pattern: [Evidence manager](/docs/patterns/evidence-manager).

---

## Lab 3: Build a domain exposure mapper

### Objective

Map authorized public-facing assets for a domain.

### Requirements

- DNS collection
- Certificate lookup
- Subdomain normalization
- Service enrichment (Shodan or Censys-style adapter)
- Asset table UI
- Report export

### Deliverable

Domain exposure report — see [Domain exposure mapper](/docs/patterns/domain-exposure-mapper).

---

## Lab 4: Build a media verification board

### Objective

Verify an image or video using public evidence.

### Requirements

- Upload image/video
- Extract keyframes
- Save reverse-search links (manual or API where permitted)
- Archive links per source page
- Source timeline + confidence assignment

### Deliverable

Verification report — [Media verification workspace](/docs/patterns/media-verification-workspace).

---

## Lab 5: Build a timeline generator

### Objective

Turn public sources into a sourced event timeline.

### Requirements

- Search results intake
- Timestamp extraction + timezone normalization
- Duplicate detection
- Source reliability tags
- Interactive [Timeline](/docs/ui/timeline) UI
- Markdown export

### Deliverable

Interactive timeline + brief — [Event timeline builder](/docs/patterns/event-timeline-builder).

## Prerequisites

- [Pipeline overview](/docs/architecture/pipeline-overview)
- [Plugin SDK](/docs/platform/plugin-sdk)
- [Data model](/docs/platform/data-model)

Read [Safety & policy](/docs/safety/policy) before running labs against live sources.

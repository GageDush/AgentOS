# Entity model

Every OSINT tool eventually needs a **shared entity schema**. Normalize early so enrichment, correlation, and UI components stay reusable.

## Entity design

Each entity should have:

- Stable ID
- Type
- Value
- Source
- First seen timestamp
- Last seen timestamp
- Confidence
- Tags
- Raw evidence links
- Derived relationships

## Network entities

- Domain
- Subdomain
- IP address
- ASN
- DNS record
- Certificate
- Port
- Service
- Technology fingerprint

## Web entities

- URL
- Web page
- Archived page
- Screenshot
- HTML document
- Metadata record

## Media entities

- Image
- Video
- Audio
- Keyframe
- Thumbnail
- EXIF metadata
- Reverse-search match

## Social / web identity entities

Public-facing identifiers only — usernames, profile URLs, public posts, display names, avatar images, bio text, external links.

## Organization entities

- Company name
- Legal entity
- Public filing
- Press release
- Official website
- Public contact page

## Geospatial entities

- Coordinate
- Address
- Landmark
- Road
- Building
- Administrative boundary
- Map feature

## Evidence entities

- Evidence item
- Claim
- Source citation
- Archive snapshot
- Screenshot
- Analyst note

## Schema storage

Table definitions for `entities`, `relationships`, and `evidence_items` live in [Data model](/docs/platform/data-model).

Normalization rules: [Normalization](/docs/architecture/normalization). Matching rules: [Entity resolver](/docs/components/entity-resolver).

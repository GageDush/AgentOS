# Entity resolver

Determines whether two records refer to the **same entity** — critical for deduplication and graph quality.

## Matching methods

- Exact match
- Case-normalized match
- Fuzzy match (Levenshtein, phonetic — use sparingly)
- URL canonicalization
- Domain normalization (www strip, punycode)
- Timestamp window comparison
- Shared identifiers (cert SAN, email domain)
- Source reliability weighting

## Risk

Entity resolution creates **false links**. Mitigations:

- Emit `POSSIBLY_SAME_AS` below confidence threshold
- Store resolver method + score on merge
- Never auto-merge across entity types
- Allow analyst split/merge in UI

## Service

`entity-service` creates and merges normalized entities — [Backend services](/docs/platform/backend-services).

## Related

- [Correlation](/docs/architecture/correlation) relationship types
- [Confidence scoring](/docs/components/confidence-scoring)

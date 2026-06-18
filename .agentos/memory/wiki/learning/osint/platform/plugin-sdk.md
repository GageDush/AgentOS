---
slug: learning/osint/platform/plugin-sdk
title: Plugin Sdk
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Plugin Sdk

Source: `apps/command-center/src/content/docs/platform/plugin-sdk.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/platform/plugin-sdk` (flous.dev/docs).

## Article

# Plugin SDK

Adapter interface for plugging new public sources into the pipeline.

## `SourceAdapter` interface

```ts
interface SourceAdapter {
  id: string
  name: string
  inputTypes: string[]
  outputTypes: string[]

  validateInput(input: AdapterInput): Promise<ValidationResult>

  collect(input: AdapterInput, context: CollectionContext): Promise<RawArtifact[]>

  parse(artifact: RawArtifact): Promise<ParsedRecord[]>

  normalize(record: ParsedRecord): Promise<Entity[]>
}
```

## `AdapterMetadata`

```ts
type AdapterMetadata = {
  id: string
  name: string
  category: "search" | "archive" | "dns" | "media" | "map" | "cyber" | "dataset"
  requiresAuth: boolean
  rateLimit: string
  allowedUse: string[]
  disallowedUse: string[]
}
```

## Registration

1. Implement adapter class
2. Register in `source-registry`
3. Declare metadata for [Scope banner](/docs/ui/scope-banner) allowlists
4. Add parser tests with fixture files

## Lab

[Lab 1: Build a source adapter](/docs/labs/overview#lab-1-build-a-source-adapter)

## Reference architectures

| System | Pattern |
|--------|---------|
| [Maltego Transform Hub](https://www.maltego.com/transform-hub/) | Hub connects sources; transforms map entity → API → new entities |
| [OWASP Amass](https://owasp.org/www-project-amass/) | Subcommand plugins + shared asset DB |
| [Shodan API](https://developer.shodan.io/api) | REST adapter with query DSL |

## Pipeline

Adapters plug in at [Source adapters](/docs/architecture/source-adapters) — upstream of [Collector](/docs/components/collector).

## Related

- [[learning/osint/index]]
- [[index]]

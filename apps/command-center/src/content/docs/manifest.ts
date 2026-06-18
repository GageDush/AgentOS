export type DocsPageMeta = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

export type DocsTopic = {
  id: string;
  title: string;
  description: string;
  order: number;
  pages: DocsPageMeta[];
};

export const DOCS_TOPICS: DocsTopic[] = [
  {
    id: "start",
    title: "Start here",
    description: "OSINT as a modular tooling ecosystem.",
    order: 1,
    pages: [
      {
        slug: "welcome",
        title: "Welcome",
        description: "What this component docs pack teaches and how to use it.",
        order: 1
      }
    ]
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "Pipeline layers from input to UI and report.",
    order: 2,
    pages: [
      {
        slug: "architecture/pipeline-overview",
        title: "Pipeline overview",
        description: "Input → adapter → collector → parser → normalizer → enricher → correlator → storage → UI.",
        order: 1
      },
      {
        slug: "architecture/entity-model",
        title: "Entity model",
        description: "Network, web, media, identity, organization, geospatial, and evidence entities.",
        order: 2
      },
      {
        slug: "architecture/source-adapters",
        title: "Source adapters",
        description: "Connecting to public sources behind a common interface.",
        order: 3
      },
      {
        slug: "architecture/collection",
        title: "Collection jobs",
        description: "Retrieval, rate limits, caching, and raw response storage.",
        order: 4
      },
      {
        slug: "architecture/normalization",
        title: "Normalization",
        description: "Source-specific records into canonical entities.",
        order: 5
      },
      {
        slug: "architecture/enrichment",
        title: "Enrichment",
        description: "Follow-on context chains for domains, images, URLs, and orgs.",
        order: 6
      },
      {
        slug: "architecture/correlation",
        title: "Correlation",
        description: "Relationship types and graph output.",
        order: 7
      },
      {
        slug: "architecture/storage",
        title: "Storage",
        description: "SQLite, Postgres, object storage, graph DB, and search index.",
        order: 8
      }
    ]
  },
  {
    id: "components",
    title: "Components",
    description: "Reusable building blocks for OSINT tools.",
    order: 3,
    pages: [
      {
        slug: "components/query-builder",
        title: "Query builder",
        description: "Structured search queries from user inputs.",
        order: 1
      },
      {
        slug: "components/collector",
        title: "Collector",
        description: "Pagination, retries, rate limits, and raw artifacts.",
        order: 2
      },
      {
        slug: "components/parser",
        title: "Parser",
        description: "HTML, JSON, EXIF, DNS, and certificate parsers.",
        order: 3
      },
      {
        slug: "components/entity-resolver",
        title: "Entity resolver",
        description: "Exact, fuzzy, and canonical matching with uncertainty.",
        order: 4
      },
      {
        slug: "components/evidence-vault",
        title: "Evidence vault",
        description: "Sources, screenshots, hashes, and citation trails.",
        order: 5
      },
      {
        slug: "components/confidence-scoring",
        title: "Confidence scoring",
        description: "Grading findings from source reliability and corroboration.",
        order: 6
      },
      {
        slug: "components/redaction-engine",
        title: "Redaction engine",
        description: "Strip sensitive details before display and export.",
        order: 7
      },
      {
        slug: "components/audit-logs",
        title: "Audit logs",
        description: "Who queried what, when, and under which scope.",
        order: 8
      }
    ]
  },
  {
    id: "adapters",
    title: "Source adapters",
    description: "Catalog of public-source adapter patterns.",
    order: 4,
    pages: [
      {
        slug: "adapters/search-engines",
        title: "Search engines",
        description: "Indexed web content queries and result scoring.",
        order: 1
      },
      {
        slug: "adapters/archives",
        title: "Archives",
        description: "Historical snapshots, CDX, and diff views.",
        order: 2
      },
      {
        slug: "adapters/dns",
        title: "DNS",
        description: "Public DNS records and exposure tables.",
        order: 3
      },
      {
        slug: "adapters/certificates",
        title: "Certificates",
        description: "Certificate transparency and subdomain extraction.",
        order: 4
      },
      {
        slug: "adapters/internet-exposure",
        title: "Internet exposure",
        description: "Shodan, Censys, and scan-database patterns.",
        order: 5
      },
      {
        slug: "adapters/maps",
        title: "Maps & geospatial",
        description: "OpenStreetMap, Overpass, and location evidence.",
        order: 6
      },
      {
        slug: "adapters/media-verification",
        title: "Media verification",
        description: "Reverse search, keyframes, and metadata viewers.",
        order: 7
      },
      {
        slug: "adapters/public-datasets",
        title: "Public datasets",
        description: "Government and institutional open data connectors.",
        order: 8
      }
    ]
  },
  {
    id: "patterns",
    title: "Tool patterns",
    description: "Remix components into complete tools.",
    order: 5,
    pages: [
      {
        slug: "patterns/self-osint-audit",
        title: "Self-OSINT audit",
        description: "Find and reduce your own public exposure.",
        order: 1
      },
      {
        slug: "patterns/domain-exposure-mapper",
        title: "Domain exposure mapper",
        description: "Map authorized public-facing assets for a domain.",
        order: 2
      },
      {
        slug: "patterns/brand-impersonation-monitor",
        title: "Brand impersonation monitor",
        description: "Lookalike domains, fake pages, and similarity scoring.",
        order: 3
      },
      {
        slug: "patterns/media-verification-workspace",
        title: "Media verification workspace",
        description: "Verify images and videos with sourced timelines.",
        order: 4
      },
      {
        slug: "patterns/event-timeline-builder",
        title: "Event timeline builder",
        description: "Chronological public-event reconstruction.",
        order: 5
      },
      {
        slug: "patterns/evidence-manager",
        title: "Evidence manager",
        description: "Local-first claims, notes, and report builder.",
        order: 6
      }
    ]
  },
  {
    id: "ui",
    title: "UI components",
    description: "Cards, graphs, timelines, and report surfaces.",
    order: 6,
    pages: [
      {
        slug: "ui/entity-card",
        title: "Entity card",
        description: "Type, value, confidence, and source count.",
        order: 1
      },
      {
        slug: "ui/evidence-card",
        title: "Evidence card",
        description: "Claim, source, archive link, and analyst note.",
        order: 2
      },
      {
        slug: "ui/timeline",
        title: "Timeline",
        description: "Events, contradictions, and evidence links.",
        order: 3
      },
      {
        slug: "ui/graph",
        title: "Graph",
        description: "Nodes, edges, relationship types, and filters.",
        order: 4
      },
      {
        slug: "ui/map",
        title: "Map",
        description: "Candidate locations and evidence pins.",
        order: 5
      },
      {
        slug: "ui/diff-viewer",
        title: "Diff viewer",
        description: "Live vs archived page and metadata changes.",
        order: 6
      },
      {
        slug: "ui/scope-banner",
        title: "Scope banner",
        description: "Purpose, allowed sources, and retention rules.",
        order: 7
      },
      {
        slug: "ui/report-builder",
        title: "Report builder",
        description: "Markdown, PDF, and HTML export templates.",
        order: 8
      }
    ]
  },
  {
    id: "platform",
    title: "Platform",
    description: "Backend services, schema, and adapter SDK.",
    order: 7,
    pages: [
      {
        slug: "platform/backend-services",
        title: "Backend services",
        description: "Registry, workers, entity, evidence, graph, and report services.",
        order: 1
      },
      {
        slug: "platform/data-model",
        title: "Data model",
        description: "SQL tables for sources, jobs, entities, and evidence.",
        order: 2
      },
      {
        slug: "platform/plugin-sdk",
        title: "Plugin SDK",
        description: "SourceAdapter interface and adapter metadata.",
        order: 3
      },
      {
        slug: "platform/roadmap",
        title: "Component roadmap",
        description: "MVP, V2, and V3 component priorities.",
        order: 4
      }
    ]
  },
  {
    id: "labs",
    title: "Labs",
    description: "Hands-on builds for adapters, vaults, and reports.",
    order: 8,
    pages: [
      {
        slug: "labs/overview",
        title: "Labs overview",
        description: "Five labs from source adapter to timeline generator.",
        order: 1
      }
    ]
  },
  {
    id: "reference",
    title: "Reference",
    description: "External tool directories and API anchors.",
    order: 9,
    pages: [
      {
        slug: "reference/source-bank",
        title: "Source bank",
        description: "Amass, Shodan, Censys, Maltego, OSM, Bellingcat, and more.",
        order: 1
      }
    ]
  },
  {
    id: "safety",
    title: "Safety & policy",
    description: "Scope modes, disallowed use, and privacy resources.",
    order: 10,
    pages: [
      {
        slug: "safety/policy",
        title: "Safety & policy",
        description: "Disallowed use, scope modes, and privacy references.",
        order: 1
      }
    ]
  }
];

export function allDocsPages(): DocsPageMeta[] {
  return [...DOCS_TOPICS]
    .sort((a, b) => a.order - b.order)
    .flatMap((topic) => [...topic.pages].sort((a, b) => a.order - b.order));
}

export function findDocsPage(slug: string): DocsPageMeta | undefined {
  return allDocsPages().find((page) => page.slug === slug);
}

export function findDocsTopic(topicId: string): DocsTopic | undefined {
  return DOCS_TOPICS.find((topic) => topic.id === topicId);
}

export function slugToPath(slug: string): string {
  return `/docs/${slug}`;
}

import Link from "next/link";
import { DOCS_TOPICS, slugToPath } from "../../content/docs/manifest";

const QUICK_START = [
  { slug: "welcome", label: "Welcome" },
  { slug: "architecture/pipeline-overview", label: "Pipeline" },
  { slug: "components/evidence-vault", label: "Evidence vault" },
  { slug: "platform/plugin-sdk", label: "Plugin SDK" }
];

const CORE_COMPONENTS = [
  "SourceAdapter",
  "EntityResolver",
  "EvidenceVault",
  "ConfidenceBadge",
  "Timeline",
  "Graph",
  "Redactor",
  "ReportBuilder"
];

export function DocsHub() {
  return (
    <div className="flous-docs-hub">
      <header className="flous-docs-hero">
        <p className="flous-docs-eyebrow">OSINT component library</p>
        <h1 className="flous-docs-hero-title">OSINT Tooling Docs</h1>
        <p className="flous-docs-hero-lead">
          A developer-oriented docs pack for building OSINT tools as reusable software — source
          adapters, enrichment pipelines, entity graphs, evidence vaults, and verification UIs you
          can remix into search tools, asset mappers, and audit dashboards.
        </p>
        <div className="flous-docs-hero-actions">
          <Link href={slugToPath("welcome")} className="flous-docs-btn flous-docs-btn-primary">
            Get started
          </Link>
          <Link href={slugToPath("architecture/pipeline-overview")} className="flous-docs-btn flous-docs-btn-ghost">
            Pipeline overview
          </Link>
        </div>
      </header>

      <section className="flous-docs-quickstart">
        <h2 className="flous-docs-section-title">Quick start</h2>
        <div className="flous-docs-quickstart-grid">
          {QUICK_START.map((item) => (
            <Link key={item.slug} href={slugToPath(item.slug)} className="flous-docs-quick-card">
              <span className="flous-docs-quick-card-label">{item.label}</span>
              <span className="flous-docs-quick-card-arrow" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flous-docs-component-strip">
        <h2 className="flous-docs-section-title">Core components</h2>
        <div className="flous-docs-chip-row">
          {CORE_COMPONENTS.map((name) => (
            <span key={name} className="flous-docs-chip">
              {name}
            </span>
          ))}
        </div>
        <p className="flous-docs-component-copy">
          Wire these blocks together — not a course, a{" "}
          <Link href={slugToPath("patterns/self-osint-audit")} className="flous-docs-inline-link">
            tool pattern
          </Link>{" "}
          at a time. See the{" "}
          <Link href={slugToPath("platform/roadmap")} className="flous-docs-inline-link">
            component roadmap
          </Link>{" "}
          for MVP → V3 ordering.
        </p>
      </section>

      <section className="flous-docs-topics">
        <h2 className="flous-docs-section-title">Browse by topic</h2>
        <div className="flous-docs-topic-grid">
          {DOCS_TOPICS.map((topic) => (
            <article key={topic.id} className="flous-docs-topic-card">
              <h3 className="flous-docs-topic-title">{topic.title}</h3>
              <p className="flous-docs-topic-desc">{topic.description}</p>
              <ul className="flous-docs-topic-links">
                {topic.pages.map((page) => (
                  <li key={page.slug}>
                    <Link href={slugToPath(page.slug)} className="flous-docs-topic-link">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="flous-docs-callout">
        <div>
          <h2 className="flous-docs-callout-title">Policy & scope</h2>
          <p className="flous-docs-callout-copy">
            Safety modes, disallowed use, and privacy references live in one place at the end of the
            sidebar — not repeated on every page.
          </p>
        </div>
        <Link href={slugToPath("safety/policy")} className="flous-docs-btn flous-docs-btn-ghost">
          Safety & policy
        </Link>
      </section>
    </div>
  );
}

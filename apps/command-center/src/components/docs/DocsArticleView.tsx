import Link from "next/link";
import { DocsMarkdown } from "./DocsMarkdown";
import { DocsToc } from "./DocsToc";
import type { DocsArticle } from "../../lib/docs-content";
import { slugToPath } from "../../content/docs/manifest";

type DocsArticleViewProps = {
  article: DocsArticle;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
};

export function DocsArticleView({ article, prev, next }: DocsArticleViewProps) {
  const topicSlug = article.slug.split("/")[0];

  return (
    <div className="flous-docs-article-layout">
      <article className="flous-docs-article">
        <header className="flous-docs-article-header">
          <p className="flous-docs-breadcrumb">
            <Link href="/docs">Docs</Link>
            <span aria-hidden> / </span>
            <span>{topicSlug.replace(/-/g, " ")}</span>
          </p>
          <h1 className="flous-docs-article-title">{article.title}</h1>
          <p className="flous-docs-article-desc">{article.description}</p>
        </header>

        <DocsMarkdown body={article.body} />

        <footer className="flous-docs-pager">
          {prev ? (
            <Link href={slugToPath(prev.slug)} className="flous-docs-pager-link flous-docs-pager-prev">
              <span className="flous-docs-pager-label">Previous</span>
              <span className="flous-docs-pager-title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={slugToPath(next.slug)} className="flous-docs-pager-link flous-docs-pager-next">
              <span className="flous-docs-pager-label">Next</span>
              <span className="flous-docs-pager-title">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </footer>
      </article>

      <DocsToc headings={article.headings} />
    </div>
  );
}

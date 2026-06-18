"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { DOCS_TOPICS, slugToPath, type DocsPageMeta } from "../../content/docs/manifest";
import "./forge-docs.css";

type DocsSidebarProps = {
  currentSlug?: string;
};

export function DocsSidebar({ currentSlug }: DocsSidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const allPages = useMemo(
    () =>
      DOCS_TOPICS.flatMap((topic) =>
        topic.pages.map((page) => ({ ...page, topicTitle: topic.title, topicId: topic.id }))
      ),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allPages.filter(
      (page) =>
        page.title.toLowerCase().includes(q) ||
        page.description.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q)
    );
  }, [allPages, query]);

  const isHub = pathname === "/docs";

  return (
    <aside className="flous-docs-sidebar" aria-label="Documentation navigation">
      <div className="flous-docs-sidebar-search">
        <label className="flous-docs-search-label" htmlFor="docs-sidebar-search">
          Search docs
        </label>
        <input
          id="docs-sidebar-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter topics…"
          className="flous-docs-search-input"
          autoComplete="off"
        />
      </div>

      {filtered ? (
        <nav className="flous-docs-sidebar-nav">
          <p className="flous-docs-sidebar-kicker">Results</p>
          <ul className="flous-docs-nav-list">
            {filtered.length === 0 ? (
              <li className="flous-docs-nav-empty">No matches</li>
            ) : (
              filtered.map((page) => (
                <DocsNavItem key={page.slug} page={page} active={currentSlug === page.slug} />
              ))
            )}
          </ul>
        </nav>
      ) : (
        <nav className="flous-docs-sidebar-nav">
          <Link
            href="/docs"
            className={`flous-docs-nav-hub ${isHub ? "flous-docs-nav-item-active" : ""}`}
          >
            Docs home
          </Link>

          {DOCS_TOPICS.map((topic) => (
            <section key={topic.id} className="flous-docs-sidebar-section">
              <p className="flous-docs-sidebar-kicker">{topic.title}</p>
              <ul className="flous-docs-nav-list">
                {topic.pages.map((page) => (
                  <DocsNavItem key={page.slug} page={page} active={currentSlug === page.slug} />
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </aside>
  );
}

function DocsNavItem({
  page,
  active
}: {
  page: DocsPageMeta & { topicTitle?: string };
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={slugToPath(page.slug)}
        className={`flous-docs-nav-item ${active ? "flous-docs-nav-item-active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {page.title}
      </Link>
    </li>
  );
}

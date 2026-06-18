"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MagneticButton } from "@agentos/ui";
import { apiGet, apiPost } from "../../lib/agentos-api";
import { ForgeMemoryQueuePanel } from "./ForgeMemoryQueuePanel";
import { WikiMarkdown } from "./WikiMarkdown";
import { wikiCategory } from "./wiki/wiki-category";
import { EMPTY_WIKI_GRAPH, type WikiGraph } from "./wiki/wiki-graph-layout";
import "./forge-wiki.css";

// React Flow is client-only — load the Map canvas without SSR.
const WikiGraphCanvas = dynamic(() => import("./wiki/WikiGraphCanvas").then((m) => m.WikiGraphCanvas), {
  ssr: false,
  loading: () => <p className="forge-muted-copy">Loading graph…</p>
});

type WikiArticleSummary = {
  slug: string;
  title: string;
  tags: string[];
  path: string;
  updatedAt: string;
  archived: boolean;
};

type WikiArticle = WikiArticleSummary & {
  frontmatter: Record<string, unknown>;
  body: string;
  outboundLinks: string[];
};

type WikiListResponse = {
  articles: WikiArticleSummary[];
  count: number;
};

type WikiArticleResponse = {
  article: WikiArticle;
  backlinks: Array<{ slug: string; title: string }>;
};

type WikiSearchMatch = {
  slug: string;
  title: string;
  excerpt: string;
  score: number;
  sectionHeading?: string;
};

const FEATURED_SLUGS = [
  "product/forge-command-center-consolidated",
  "flows/cursor-memory",
  "sessions/cursor/index",
  "index"
];

export function ForgeWikiView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugParam = searchParams.get("slug") ?? "";
  const viewParam = searchParams.get("view") === "map" ? "map" : "browse";
  const mapCategory = searchParams.get("category") ?? "all";

  const [graph, setGraph] = useState<WikiGraph>(EMPTY_WIKI_GRAPH);
  const [articles, setArticles] = useState<WikiArticleSummary[]>([]);
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [backlinks, setBacklinks] = useState<Array<{ slug: string; title: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WikiSearchMatch[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<string>();

  const navigate = useCallback(
    (slug: string, anchor?: string) => {
      const params = new URLSearchParams();
      params.set("slug", slug);
      if (anchor) params.set("anchor", anchor);
      router.push(`/wiki?${params.toString()}`);
    },
    [router]
  );

  // Merge URL params (null deletes) — drives the Browse/Map tab + map state.
  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `/wiki?${qs}` : "/wiki");
    },
    [router, searchParams]
  );

  const openBrowse = useCallback(() => pushParams({ view: null, category: null, anchor: null }), [pushParams]);
  const openMap = useCallback(() => pushParams({ view: "map" }), [pushParams]);
  const mapSelect = useCallback((slug: string) => pushParams({ view: "map", slug: slug || null }), [pushParams]);
  const mapOpen = useCallback((slug: string) => pushParams({ view: null, category: null, anchor: null, slug }), [pushParams]);
  const mapSetCategory = useCallback(
    (category: string) => pushParams({ view: "map", category: category === "all" ? null : category }),
    [pushParams]
  );

  // Load the wikilink graph only when the Map tab is active.
  useEffect(() => {
    if (viewParam !== "map") return;
    let active = true;
    void (async () => {
      const data = await apiGet<WikiGraph>("/memory/wiki/graph", EMPTY_WIKI_GRAPH);
      if (active) setGraph(data);
    })();
    return () => {
      active = false;
    };
  }, [viewParam]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    const data = await apiGet<WikiListResponse>("/memory/wiki", { articles: [], count: 0 });
    setArticles(data.articles ?? []);
    setLoadingList(false);
  }, []);

  const loadArticle = useCallback(async (slug: string) => {
    if (!slug) {
      setArticle(null);
      setBacklinks([]);
      return;
    }
    setLoadingArticle(true);
    const result = await fetch(
      `/agentos-api/memory/wiki/article?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } }
    );
    if (!result.ok) {
      setArticle(null);
      setBacklinks([]);
      setLoadingArticle(false);
      return;
    }
    const data = (await result.json()) as WikiArticleResponse;
    setArticle(data.article);
    setBacklinks(data.backlinks ?? []);
    setLoadingArticle(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadArticle(slugParam);
  }, [slugParam, loadArticle]);

  useEffect(() => {
    const anchor = searchParams.get("anchor");
    if (!anchor || loadingArticle) return;
    const el = document.getElementById(anchor);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, loadingArticle, article?.slug]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiPost<{ matches: WikiSearchMatch[] }>("/memory/wiki/search", {
          query: searchQuery,
          limit: 16
        });
        setSearchResults(data.matches ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const categories = useMemo(() => {
    const set = new Set(articles.map((a) => wikiCategory(a.slug)));
    return ["all", ...Array.from(set).sort()];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (categoryFilter !== "all") {
      list = list.filter((a) => wikiCategory(a.slug) === categoryFilter);
    }
    if (searchQuery.trim() && searchResults.length) {
      const slugs = new Set(searchResults.map((m) => m.slug));
      list = list.filter((a) => slugs.has(a.slug));
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [articles, categoryFilter, searchQuery, searchResults]);

  const featured = useMemo(
    () => FEATURED_SLUGS.map((slug) => articles.find((a) => a.slug === slug)).filter(Boolean) as WikiArticleSummary[],
    [articles]
  );

  async function runSync(action: "cursor" | "rebuild", full = false) {
    setBusyAction(action);
    setStatusMessage(undefined);
    try {
      if (action === "cursor") {
        const result = await apiPost<{ indexed?: number; updated?: number; skipped?: number }>(
          "/memory/wiki/sync-cursor",
          { full }
        );
        setStatusMessage(
          `Cursor sync: ${result.indexed ?? 0} indexed, ${result.updated ?? 0} updated, ${result.skipped ?? 0} skipped.`
        );
      } else {
        const result = await apiPost<{ count?: number }>("/memory/wiki/rebuild", {});
        setStatusMessage(`Manifest rebuilt — ${result.count ?? 0} articles indexed.`);
      }
      await loadList();
      if (slugParam) await loadArticle(slugParam);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Wiki action failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  return (
    <div className="forge-wiki-shell">
      <div className="forge-wiki-toolbar">
        <label className="forge-wiki-search">
          <span className="forge-mono forge-wiki-search-label">Search wiki</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Forge UI, cursor sessions, agents…"
            className="forge-wiki-search-input"
          />
        </label>
        <div className="forge-wiki-tabs" role="tablist" aria-label="Wiki view">
          <button
            type="button"
            role="tab"
            aria-selected={viewParam === "browse"}
            className={`forge-wiki-tab${viewParam === "browse" ? " on" : ""}`}
            onClick={openBrowse}
          >
            Browse
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewParam === "map"}
            className={`forge-wiki-tab${viewParam === "map" ? " on" : ""}`}
            onClick={openMap}
          >
            Map
          </button>
        </div>
        <div className="forge-wiki-toolbar-actions">
          <MagneticButton
            size="sm"
            disabled={busyAction === "cursor"}
            onClick={() => void runSync("cursor")}
          >
            Sync Cursor chats
          </MagneticButton>
          <MagneticButton
            size="sm"
            disabled={busyAction === "rebuild"}
            onClick={() => void runSync("rebuild")}
          >
            Rebuild index
          </MagneticButton>
          <MagneticButton size="sm" onClick={() => navigate("index")}>
            Wiki home
          </MagneticButton>
        </div>
      </div>

      {statusMessage ? <p className="forge-wiki-status forge-mono">{statusMessage}</p> : null}

      {viewParam === "map" ? (
        <div className="forge-wiki-map">
          <WikiGraphCanvas
            graph={graph}
            selectedSlug={slugParam}
            category={mapCategory}
            onSelect={mapSelect}
            onOpen={mapOpen}
            onCategoryChange={mapSetCategory}
          />
        </div>
      ) : (
      <div className="forge-wiki-layout">
        <aside className="forge-wiki-sidebar">
          {featured.length ? (
            <div className="forge-wiki-sidebar-block">
              <p className="forge-wiki-sidebar-kicker">Start here</p>
              <ul className="forge-wiki-link-list">
                {featured.map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      className={`forge-wiki-nav-item ${slugParam === item.slug ? "forge-wiki-nav-item-active" : ""}`}
                      onClick={() => navigate(item.slug)}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="forge-wiki-sidebar-block">
            <p className="forge-wiki-sidebar-kicker">Browse</p>
            <div className="forge-wiki-category-row">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`forge-chip ${categoryFilter === cat ? "forge-boot-chip-active" : ""}`.trim()}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="forge-wiki-sidebar-block forge-wiki-sidebar-scroll">
            <p className="forge-wiki-sidebar-kicker">
              Articles {loadingList ? "…" : `(${filteredArticles.length})`}
            </p>
            {searchQuery.trim() && searchResults.length ? (
              <ul className="forge-wiki-link-list">
                {searchResults.map((match) => (
                  <li key={`${match.slug}-${match.sectionHeading ?? ""}`}>
                    <button
                      type="button"
                      className="forge-wiki-nav-item"
                      onClick={() => navigate(match.slug)}
                    >
                      <span>{match.title}</span>
                      {match.sectionHeading ? (
                        <span className="forge-wiki-nav-sub">{match.sectionHeading}</span>
                      ) : null}
                      <span className="forge-wiki-nav-excerpt">{match.excerpt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="forge-wiki-link-list">
                {filteredArticles.slice(0, 80).map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      className={`forge-wiki-nav-item ${slugParam === item.slug ? "forge-wiki-nav-item-active" : ""}`}
                      onClick={() => navigate(item.slug)}
                    >
                      <span>{item.title}</span>
                      <span className="forge-wiki-nav-sub">{wikiCategory(item.slug)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="forge-wiki-sidebar-block">
            <ForgeMemoryQueuePanel />
          </div>
        </aside>

        <main className="forge-wiki-main">
          {!slugParam ? (
            <div className="forge-wiki-empty">
              <h2 className="forge-wiki-h2">Memory Wiki</h2>
              <p className="forge-wiki-p">
                Browse curated repo memory, Cursor session digests, agent journals, and consolidated project briefs.
                Pick an article from the sidebar or search above.
              </p>
              <ul className="forge-wiki-ul">
                <li>
                  <strong>Cursor sessions</strong> — what we worked on in each chat (auto-synced)
                </li>
                <li>
                  <strong>Product briefs</strong> — consolidated decisions and specs
                </li>
                <li>
                  <strong>Flows & agents</strong> — how the pipeline and crew behave
                </li>
              </ul>
              {featured[0] ? (
                <MagneticButton variant="primary" onClick={() => navigate(featured[0].slug)}>
                  Open latest brief
                </MagneticButton>
              ) : null}
            </div>
          ) : loadingArticle ? (
            <p className="forge-muted-copy">Loading article…</p>
          ) : !article ? (
            <div className="forge-wiki-empty">
              <p className="forge-wiki-p">Article not found: <code>{slugParam}</code></p>
              <MagneticButton onClick={() => navigate("index")}>Go to wiki home</MagneticButton>
            </div>
          ) : (
            <>
              <header className="forge-wiki-article-header">
                <p className="forge-mono forge-wiki-meta">
                  {wikiCategory(article.slug)} · {new Date(article.updatedAt).toLocaleString()}
                </p>
                <h1 className="forge-wiki-title">{article.title}</h1>
                {article.tags.length ? (
                  <div className="forge-wiki-tags">
                    {article.tags.map((tag) => (
                      <span key={tag} className="forge-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <WikiMarkdown body={article.body} onNavigate={navigate} />

              {article.outboundLinks.length ? (
                <section className="forge-wiki-related">
                  <h3 className="forge-wiki-h3">Linked articles</h3>
                  <ul className="forge-wiki-ul">
                    {article.outboundLinks.map((link) => {
                      const target = articles.find((a) => a.slug === link);
                      return (
                        <li key={link}>
                          <button type="button" className="forge-wiki-link" onClick={() => navigate(link)}>
                            {target?.title ?? link}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {backlinks.length ? (
                <section className="forge-wiki-related">
                  <h3 className="forge-wiki-h3">Backlinks</h3>
                  <ul className="forge-wiki-ul">
                    {backlinks.map((link) => (
                      <li key={link.slug}>
                        <button type="button" className="forge-wiki-link" onClick={() => navigate(link.slug)}>
                          {link.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
      )}
    </div>
  );
}

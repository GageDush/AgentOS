export type WikiArticleSource = {
  runId?: string;
  agent?: string;
  at?: string;
};

export type WikiArticleFrontmatter = {
  slug: string;
  title: string;
  tags?: string[];
  sources?: WikiArticleSource[];
  confidence?: number;
  supersedes?: string[];
  valid_from?: string;
  valid_to?: string | null;
  invalidated_at?: string | null;
  archived?: boolean;
};

export type WikiSectionIndexEntry = {
  heading: string;
  anchor: string;
  summary: string;
  entities: string[];
};

export type WikiIndexEntry = {
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  entities: string[];
  outLinks: string[];
  updatedAt: string;
  sections?: WikiSectionIndexEntry[];
};

export type WikiArticleSection = {
  slug: string;
  heading: string;
  anchor: string;
  level: number;
  content: string;
};

export type WikiSectionHit = {
  slug: string;
  heading: string;
  anchor: string;
  content: string;
  score: number;
};

export type WikiSectionScoreSignals = {
  queryTerms: string[];
  repoPaths: string[];
  seedSlugs: Set<string>;
  hopBySlug: Map<string, number>;
  articleSlug: string;
  articleTitle: string;
  articleTags: string[];
  preferredHeadings: string[];
  updatedAt?: string;
  manifestSectionScore?: number;
};

export type WikiRetrieveSignals = {
  queryTerms?: string[];
  repoPaths?: string[];
  preferredSlugs?: string[];
  taskType?: string;
};

export type WikiIndexManifest = {
  version: 1;
  generatedAt: string;
  articles: WikiIndexEntry[];
};

export type WikiArticleSummary = {
  slug: string;
  title: string;
  tags: string[];
  path: string;
  updatedAt: string;
  archived: boolean;
};

export type WikiArticle = WikiArticleSummary & {
  frontmatter: WikiArticleFrontmatter;
  body: string;
  outboundLinks: string[];
};

export type WikiLinkRef = {
  slug: string;
  heading?: string;
  label?: string;
};

export type WikiGraph = {
  articles: Record<string, WikiArticleSummary>;
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
};

export type WikiSearchMatch = {
  slug: string;
  title: string;
  excerpt: string;
  score: number;
  sectionHeading?: string;
  sectionAnchor?: string;
};

export type WikiRetrieveOptions = {
  maxHops?: number;
  maxChars?: number;
  maxArticles?: number;
  maxSections?: number;
  /** When true (default), expand returns scored sections instead of full article bodies. */
  sectionLevel?: boolean;
  /** Manifest- or router-scored slugs merged before keyword search seeds. */
  seedSlugs?: string[];
  signals?: WikiRetrieveSignals;
};

export type WikiContextBridgeResult = {
  manifestLoaded: boolean;
  query: string;
  seedSlugs: string[];
  prunedCandidates: number;
  retrieve: WikiRetrieveResult;
};

export type WikiRetrieveResult = {
  seedSlugs: string[];
  slugs: string[];
  articles: WikiArticle[];
  sections: WikiSectionHit[];
  chars: number;
  sectionCount: number;
};

import type { WikiArticleSection, WikiSectionIndexEntry, WikiSectionScoreSignals } from "./types";

export function headingToAnchor(heading: string) {
  return heading
    .toLowerCase()
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripFrontmatter(body: string) {
  return body.replace(/^---[\s\S]*?---\s*/m, "").trim();
}

export function parseArticleSections(slug: string, body: string): WikiArticleSection[] {
  const cleaned = stripFrontmatter(body);
  const lines = cleaned.split(/\r?\n/);
  const sections: WikiArticleSection[] = [];
  let current: WikiArticleSection | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(##+)\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        sections.push({ ...current, content: current.content.trim() });
      } else if (preamble.length) {
        const intro = preamble.join("\n").trim();
        if (intro) {
          sections.push({
            slug,
            heading: "Overview",
            anchor: "overview",
            level: 2,
            content: intro
          });
        }
      }

      current = {
        slug,
        heading: headingMatch[2].trim(),
        anchor: headingToAnchor(headingMatch[2]),
        level: headingMatch[1].length,
        content: ""
      };
      continue;
    }

    if (current) {
      current.content += `${current.content ? "\n" : ""}${line}`;
    } else {
      preamble.push(line);
    }
  }

  if (current) {
    sections.push({ ...current, content: current.content.trim() });
  } else if (preamble.length) {
    const intro = preamble.join("\n").trim();
    if (intro) {
      sections.push({
        slug,
        heading: "Overview",
        anchor: "overview",
        level: 2,
        content: intro
      });
    }
  }

  return sections.filter((section) => section.content.trim());
}

export function sectionIndexFromBody(body: string): WikiSectionIndexEntry[] {
  return parseArticleSections("_preview", body).map((section) => ({
    heading: section.heading,
    anchor: section.anchor,
    summary: section.content
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g, "$1")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"))
      ?.slice(0, 200) ?? "",
    entities: extractSectionEntities(section.content)
  }));
}

export function extractSectionEntities(content: string) {
  const entities = new Set<string>();
  for (const match of content.matchAll(/`([^`]+)`/g)) {
    const value = match[1]?.trim();
    if (value && value.length < 120) entities.add(value);
  }
  for (const match of content.matchAll(/\b(?:packages|apps)\/[A-Za-z0-9_./-]+/g)) {
    entities.add(match[0]);
  }
  return [...entities].slice(0, 12);
}

const PREFERRED_HEADINGS_BY_TASK: Record<string, string[]> = {
  qa: ["acceptance", "default stack", "runbook", "test"],
  bug_fix: ["gates", "flow", "observations", "risk"],
  code_change: ["mission notes", "observations", "related"],
  security: ["risk", "gates", "observations"],
  release: ["acceptance", "runbook", "related"]
};

export function preferredHeadingsForTask(taskType?: string) {
  return PREFERRED_HEADINGS_BY_TASK[taskType ?? ""] ?? [];
}

export function scoreWikiSection(section: WikiArticleSection, signals: WikiSectionScoreSignals) {
  const heading = section.heading.toLowerCase();
  const content = section.content.toLowerCase();
  let score = 0;

  for (const term of signals.queryTerms) {
    if (heading.includes(term)) score += 16;
    if (content.includes(term)) score += 6;
    if (signals.articleSlug.includes(term)) score += 4;
    if (signals.articleTitle.toLowerCase().includes(term)) score += 5;
    if (signals.articleTags.some((tag) => tag.toLowerCase().includes(term))) score += 4;
  }

  const sectionEntities = extractSectionEntities(section.content);

  for (const repoPath of signals.repoPaths) {
    const normalized = repoPath.replace(/\\/g, "/").toLowerCase();
    if (sectionEntities.some((entity) => normalized.includes(entity.toLowerCase()))) {
      score += 14;
    }
    if (content.includes(normalized)) score += 5;
  }

  for (const entity of sectionEntities) {
    for (const repoPath of signals.repoPaths) {
      if (repoPath.replace(/\\/g, "/").toLowerCase().includes(entity.toLowerCase())) {
        score += 10;
      }
    }
  }

  if (signals.seedSlugs.has(signals.articleSlug)) {
    score += 12;
  }

  const hop = signals.hopBySlug.get(signals.articleSlug) ?? 0;
  score += Math.max(0, 8 - hop * 3);

  for (const preferred of signals.preferredHeadings) {
    if (heading.includes(preferred.toLowerCase())) score += 8;
  }

  if (signals.manifestSectionScore && signals.manifestSectionScore > 0) {
    score += signals.manifestSectionScore;
  }

  if (signals.updatedAt) {
    const ageMs = Date.now() - Date.parse(signals.updatedAt);
    if (!Number.isNaN(ageMs) && ageMs < 7 * 24 * 60 * 60 * 1000) {
      score += 2;
    }
  }

  return score;
}

export function scoreManifestSection(
  entry: WikiSectionIndexEntry,
  articleSlug: string,
  articleTags: string[],
  signals: Pick<WikiSectionScoreSignals, "queryTerms" | "repoPaths" | "seedSlugs" | "preferredHeadings">
) {
  const heading = entry.heading.toLowerCase();
  const summary = entry.summary.toLowerCase();
  let score = 0;

  for (const term of signals.queryTerms) {
    if (heading.includes(term)) score += 14;
    if (summary.includes(term)) score += 5;
    if (articleSlug.includes(term)) score += 4;
    if (articleTags.some((tag) => tag.toLowerCase().includes(term))) score += 3;
  }

  for (const repoPath of signals.repoPaths) {
    const normalized = repoPath.replace(/\\/g, "/").toLowerCase();
    if (entry.entities.some((entity) => normalized.includes(entity.toLowerCase()))) {
      score += 12;
    }
  }

  if (signals.seedSlugs.has(articleSlug)) score += 8;

  for (const preferred of signals.preferredHeadings) {
    if (heading.includes(preferred.toLowerCase())) score += 6;
  }

  return score;
}

export function selectRankedSections<T extends { score: number; chars: number }>(
  ranked: T[],
  maxChars: number,
  maxSections: number
) {
  const selected: T[] = [];
  let chars = 0;

  for (const row of ranked) {
    if (selected.length >= maxSections) break;
    if (chars + row.chars > maxChars && selected.length > 0) continue;
    if (row.score <= 0) continue;
    selected.push(row);
    chars += row.chars;
  }

  return { selected, chars };
}

export function composeSectionExcerpt(
  title: string,
  sections: Array<Pick<WikiArticleSection, "heading" | "content">>
) {
  const blocks = sections.map((section) => `## ${section.heading}\n\n${section.content.trim()}`);
  return `# ${title}\n\n${blocks.join("\n\n")}\n`;
}

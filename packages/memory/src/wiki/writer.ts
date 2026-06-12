import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { MemoryUpdateEnvelope, WikiEditProposal } from "@agentos/shared";
import { nowIso } from "@agentos/shared";
import { parseFrontmatter, titleFromBody } from "./frontmatter";
import { uniqueLinkSlugs } from "./links";
import { loadWikiArticle } from "./load";
import { slugToAbsolutePath } from "./paths";
import { serializeArticle } from "./serialize";
import {
  defaultSectionForSlug,
  inferWikiSlugsFromEnvelope,
  titleFromSlug
} from "./slugify";
import type { WikiArticleFrontmatter } from "./types";
import { rebuildWikiManifest } from "./index-manifest";

export type WikiEditSource = {
  sourceAgent?: string;
  missionId?: string;
  runId?: string;
};

function sectionHeader(section: string) {
  return `## ${section}`;
}

function mergeSection(body: string, section: string, patch: string) {
  const header = sectionHeader(section);
  const normalizedPatch = patch.trim();
  if (body.includes(normalizedPatch.slice(0, Math.min(80, normalizedPatch.length)))) {
    return body;
  }

  const headerIndex = body.indexOf(header);
  if (headerIndex >= 0) {
    const afterHeader = body.slice(headerIndex + header.length);
    const nextHeader = afterHeader.search(/\n## /);
    const sectionBody = nextHeader >= 0 ? afterHeader.slice(0, nextHeader) : afterHeader;
    const insertion = sectionBody.trimEnd() ? `\n- ${normalizedPatch}` : `\n- ${normalizedPatch}`;
    if (nextHeader >= 0) {
      return `${body.slice(0, headerIndex + header.length)}${sectionBody}${insertion}${afterHeader.slice(nextHeader)}`;
    }
    return `${body.slice(0, headerIndex + header.length)}${sectionBody}${insertion}\n`;
  }

  return `${body.trimEnd()}\n\n${header}\n\n- ${normalizedPatch}\n`;
}

function appendRelatedLinks(body: string, links: string[]) {
  let next = body;
  for (const slug of links) {
    const token = `[[${slug}]]`;
    if (!next.includes(token)) {
      next = `${next.trimEnd()}\n\nSee also: ${token}\n`;
    }
  }
  return next;
}

function buildPatchLine(update: MemoryUpdateEnvelope, slug: string) {
  const areas = update.areasTouched.slice(0, 4).join(", ") || "n/a";
  const artifacts = update.artifacts.slice(0, 3).join(", ") || "n/a";
  const at = nowIso().slice(0, 19);
  return `**${at}** — ${update.sourceAgent}: ${update.summary ?? "mission update"} (scope: ${areas}; artifacts: ${artifacts})`;
}

function relatedLinksForSlug(slug: string, allSlugs: string[]) {
  return allSlugs.filter((candidate) => candidate !== slug).slice(0, 4);
}

export function proposeWikiMerges(update: MemoryUpdateEnvelope, repoRoot: string): WikiEditProposal[] {
  const slugs = inferWikiSlugsFromEnvelope(update);
  const proposals: WikiEditProposal[] = [];

  for (const slug of slugs) {
    const section = defaultSectionForSlug(slug);
    proposals.push({
      targetSlug: slug,
      action: existsSync(slugToAbsolutePath(repoRoot, slug)) ? "merge" : "create",
      section,
      markdownPatch: buildPatchLine(update, slug),
      newLinks: relatedLinksForSlug(slug, slugs),
      dedupeKey: update.summary?.trim() || undefined
    });
  }

  return proposals;
}

function ensureArticleShell(
  repoRoot: string,
  slug: string,
  source?: WikiEditSource
): { frontmatter: WikiArticleFrontmatter; body: string } {
  const existing = loadWikiArticle(repoRoot, slug);
  if (existing) {
    return { frontmatter: existing.frontmatter, body: existing.body };
  }

  const title = titleFromSlug(slug);
  const body = `# ${title}\n\nCurated wiki article for [[index|AgentOS memory]].\n`;
  return {
    frontmatter: {
      slug,
      title,
      tags: [],
      valid_from: nowIso().slice(0, 10),
      supersedes: [],
      archived: false,
      sources: source?.runId
        ? [{ runId: source.runId, agent: source.sourceAgent, at: nowIso() }]
        : []
    },
    body
  };
}

export function applyWikiEdit(
  repoRoot: string,
  proposal: WikiEditProposal,
  source?: WikiEditSource
): { slug: string; applied: boolean } {
  const filePath = slugToAbsolutePath(repoRoot, proposal.targetSlug);
  const { frontmatter, body } = ensureArticleShell(repoRoot, proposal.targetSlug, source);

  const section = proposal.section ?? defaultSectionForSlug(proposal.targetSlug);
  let nextBody = mergeSection(body, section, proposal.markdownPatch);
  nextBody = appendRelatedLinks(nextBody, proposal.newLinks);

  if (proposal.dedupeKey && body.includes(proposal.dedupeKey)) {
    return { slug: proposal.targetSlug, applied: false };
  }

  const nextFrontmatter: WikiArticleFrontmatter = {
    ...frontmatter,
    slug: proposal.targetSlug,
    title: frontmatter.title || titleFromBody(nextBody, titleFromSlug(proposal.targetSlug)),
    valid_from: frontmatter.valid_from ?? nowIso().slice(0, 10),
    valid_to: null,
    invalidated_at: null,
    sources: [
      ...(frontmatter.sources ?? []),
      ...(source?.runId
        ? [{ runId: source.runId, agent: source.sourceAgent, at: nowIso() }]
        : [])
    ].slice(-8)
  };

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serializeArticle(nextFrontmatter, nextBody), "utf8");
  rebuildWikiManifest(repoRoot);

  return { slug: proposal.targetSlug, applied: true };
}

export function applyWikiEdits(
  repoRoot: string,
  proposals: WikiEditProposal[],
  source?: WikiEditSource
) {
  const applied: string[] = [];
  for (const proposal of proposals) {
    const result = applyWikiEdit(repoRoot, proposal, source);
    if (result.applied) applied.push(result.slug);
  }
  if (applied.length) rebuildWikiManifest(repoRoot);
  return applied;
}

export function upsertWikiArticle(
  repoRoot: string,
  slug: string,
  title: string,
  tags: string[],
  body: string,
  source?: WikiEditSource
) {
  const filePath = slugToAbsolutePath(repoRoot, slug);
  const existing = loadWikiArticle(repoRoot, slug);
  const frontmatter: WikiArticleFrontmatter = {
    ...(existing?.frontmatter ?? {}),
    slug,
    title,
    tags: [...new Set([...(tags ?? []), ...(existing?.frontmatter.tags ?? [])])],
    valid_from: existing?.frontmatter.valid_from ?? nowIso().slice(0, 10),
    valid_to: null,
    invalidated_at: null,
    archived: false,
    sources: [
      ...(existing?.frontmatter.sources ?? []),
      ...(source?.runId
        ? [{ runId: source.runId, agent: source.sourceAgent, at: nowIso() }]
        : [])
    ].slice(-12)
  };

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serializeArticle(frontmatter, body), "utf8");
  return slug;
}

export function supersedeWikiFact(
  repoRoot: string,
  slug: string,
  reason: string,
  replacementSlug?: string
) {
  const article = loadWikiArticle(repoRoot, slug);
  if (!article) return false;

  const archivedBody = `${article.body.trimEnd()}\n\n## Archived\n\n- ${nowIso().slice(0, 19)} — superseded: ${reason}${
    replacementSlug ? ` → [[${replacementSlug}]]` : ""
  }\n`;

  const nextFrontmatter: WikiArticleFrontmatter = {
    ...article.frontmatter,
    invalidated_at: nowIso(),
    valid_to: nowIso().slice(0, 10),
    archived: true,
    supersedes: replacementSlug
      ? [...(article.frontmatter.supersedes ?? []), replacementSlug]
      : article.frontmatter.supersedes
  };

  writeFileSync(slugToAbsolutePath(repoRoot, slug), serializeArticle(nextFrontmatter, archivedBody), "utf8");
  rebuildWikiManifest(repoRoot);
  return true;
}

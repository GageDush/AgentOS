import type { WikiArticleFrontmatter } from "./types";

function formatInlineList(values: string[]) {
  if (!values.length) return "[]";
  return `[${values.join(", ")}]`;
}

export function serializeFrontmatter(frontmatter: WikiArticleFrontmatter): string {
  const lines = ["---"];
  lines.push(`slug: ${frontmatter.slug}`);
  lines.push(`title: ${frontmatter.title}`);
  if (frontmatter.tags?.length) lines.push(`tags: ${formatInlineList(frontmatter.tags)}`);
  if (frontmatter.valid_from) lines.push(`valid_from: ${frontmatter.valid_from}`);
  if (frontmatter.valid_to) lines.push(`valid_to: ${frontmatter.valid_to}`);
  if (frontmatter.invalidated_at) lines.push(`invalidated_at: ${frontmatter.invalidated_at}`);
  if (frontmatter.supersedes?.length) lines.push(`supersedes: ${formatInlineList(frontmatter.supersedes)}`);
  if (frontmatter.confidence !== undefined) lines.push(`confidence: ${frontmatter.confidence}`);
  if (frontmatter.archived) lines.push(`archived: true`);
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

export function serializeArticle(frontmatter: WikiArticleFrontmatter, body: string) {
  return `${serializeFrontmatter(frontmatter)}${body.trimStart()}`;
}

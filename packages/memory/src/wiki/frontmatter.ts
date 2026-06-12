import type { WikiArticleFrontmatter } from "./types";
import { normalizeWikiSlug } from "./paths";

function parseScalar(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineList(value: string): string[] {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

export function parseFrontmatter(raw: string, fallbackSlug: string): { frontmatter: WikiArticleFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallbackSlug;
    return {
      frontmatter: { slug: fallbackSlug, title, tags: [], archived: false },
      body: raw
    };
  }

  const block = match[1];
  const body = match[2] ?? "";
  const fields: Record<string, unknown> = {};

  let currentKey = "";
  let listBuffer: string[] | null = null;

  for (const line of block.split(/\r?\n/)) {
    if (listBuffer && /^\s+-\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    if (listBuffer) {
      fields[currentKey] = listBuffer;
      listBuffer = null;
      currentKey = "";
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, rest] = keyMatch;
    currentKey = key;
    const value = rest.trim();

    if (!value) {
      listBuffer = [];
      continue;
    }
    if (value.startsWith("[")) {
      fields[key] = parseInlineList(value);
    } else {
      fields[key] = parseScalar(value);
    }
  }

  if (listBuffer) {
    fields[currentKey] = listBuffer;
  }

  const slug = normalizeWikiSlug(String(fields.slug ?? fallbackSlug));
  const title = String(fields.title ?? slug.split("/").pop() ?? slug);
  const tags = Array.isArray(fields.tags) ? fields.tags.map(String) : parseInlineList(String(fields.tags ?? ""));

  const supersedes = Array.isArray(fields.supersedes)
    ? fields.supersedes.map(String)
    : typeof fields.supersedes === "string"
      ? parseInlineList(fields.supersedes)
      : [];

  return {
    frontmatter: {
      slug,
      title,
      tags,
      confidence: typeof fields.confidence === "number" ? fields.confidence : undefined,
      supersedes,
      valid_from: typeof fields.valid_from === "string" ? fields.valid_from : undefined,
      valid_to:
        fields.valid_to === null || fields.valid_to === "null"
          ? null
          : typeof fields.valid_to === "string"
            ? fields.valid_to
            : undefined,
      invalidated_at:
        fields.invalidated_at === null || fields.invalidated_at === "null"
          ? null
          : typeof fields.invalidated_at === "string"
            ? fields.invalidated_at
            : undefined,
      archived: fields.archived === true
    },
    body
  };
}

export function titleFromBody(body: string, fallback: string) {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

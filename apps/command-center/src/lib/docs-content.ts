import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { allDocsPages, findDocsPage } from "../content/docs/manifest";

const DOCS_ROOT = join(process.cwd(), "src", "content", "docs");

export type DocsHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type DocsArticle = {
  slug: string;
  title: string;
  description: string;
  body: string;
  headings: DocsHeading[];
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractHeadings(body: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      headings.push({ id: slugifyHeading(text), text, level: 2 });
    } else if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      headings.push({ id: slugifyHeading(text), text, level: 3 });
    }
  }
  return headings;
}

export function loadDocsArticle(slug: string): DocsArticle | null {
  const meta = findDocsPage(slug);
  if (!meta) return null;

  const filePath = join(DOCS_ROOT, `${slug}.md`);
  if (!existsSync(filePath)) return null;

  const body = readFileSync(filePath, "utf8");
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    body,
    headings: extractHeadings(body)
  };
}

export function allDocsSlugs(): string[] {
  return allDocsPages().map((page) => page.slug);
}

export function getAdjacentPages(slug: string): {
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
} {
  const pages = allDocsPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index < 0) return {};

  return {
    prev: index > 0 ? { slug: pages[index - 1].slug, title: pages[index - 1].title } : undefined,
    next:
      index < pages.length - 1
        ? { slug: pages[index + 1].slug, title: pages[index + 1].title }
        : undefined
  };
}

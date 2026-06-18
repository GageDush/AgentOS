import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticleView } from "../../../components/docs/DocsArticleView";
import { DocsShell } from "../../../components/docs/DocsShell";
import { allDocsSlugs, getAdjacentPages, loadDocsArticle } from "../../../lib/docs-content";

type DocsSlugPageProps = {
  params: Promise<{ slug: string[] }>;
};

export function generateStaticParams() {
  return allDocsSlugs().map((slug: string) => ({
    slug: slug.split("/")
  }));
}

export async function generateMetadata({ params }: DocsSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const article = loadDocsArticle(fullSlug);

  if (!article) {
    return { title: "Not found" };
  }

  return {
    title: article.title,
    description: article.description
  };
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const article = loadDocsArticle(fullSlug);

  if (!article) {
    notFound();
  }

  const { prev, next } = getAdjacentPages(fullSlug);

  return (
    <DocsShell currentSlug={fullSlug}>
      <DocsArticleView article={article} prev={prev} next={next} />
    </DocsShell>
  );
}

import type { DocsHeading } from "../../lib/docs-content";

type DocsTocProps = {
  headings: DocsHeading[];
};

export function DocsToc({ headings }: DocsTocProps) {
  const level2 = headings.filter((heading) => heading.level === 2);
  if (!level2.length) return null;

  return (
    <aside className="flous-docs-toc" aria-label="On this page">
      <p className="flous-docs-toc-kicker">On this page</p>
      <ul className="flous-docs-toc-list">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={heading.level === 3 ? "flous-docs-toc-item-nested" : undefined}
          >
            <a href={`#${heading.id}`} className="flous-docs-toc-link">
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

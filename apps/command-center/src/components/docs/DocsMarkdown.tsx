"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type DocsMarkdownProps = {
  body: string;
};

const DOCS_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const CODE_RE = /`([^`]+)`/g;

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function renderRichText(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const combined = new RegExp(
    `${DOCS_LINK_RE.source}|${BOLD_RE.source}|${CODE_RE.source}`,
    "g"
  );
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }

    if (match[0].startsWith("[")) {
      const label = match[1];
      const href = match[2];
      if (href.startsWith("/")) {
        parts.push(
          <Link key={`${keyPrefix}-link-${match.index}`} href={href} className="flous-docs-inline-link">
            {label}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={`${keyPrefix}-ext-${match.index}`}
            href={href}
            className="flous-docs-inline-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        );
      }
    } else if (match[0].startsWith("**")) {
      parts.push(<strong key={`${keyPrefix}-bold-${match.index}`}>{match[1]}</strong>);
    } else {
      parts.push(
        <code key={`${keyPrefix}-code-${match.index}`} className="flous-docs-inline-code">
          {match[1]}
        </code>
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.length ? parts : [text];
}

function renderCodeBlock(code: string, key: string) {
  return (
    <pre key={key} className="flous-docs-pre">
      <code>{code}</code>
    </pre>
  );
}

function renderTable(rows: string[], key: number) {
  const parsed = rows
    .map((row) =>
      row
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    )
    .filter((cells) => !cells.every((cell) => /^[-:]+$/.test(cell)));

  if (!parsed.length) return null;

  const [head, ...body] = parsed;

  return (
    <div key={`table-${key}`} className="flous-docs-table-wrap">
      <table className="flous-docs-table">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th key={i}>{renderRichText(cell, `th-${key}-${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{renderRichText(cell, `td-${key}-${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsMarkdown({ body }: DocsMarkdownProps) {
  const blocks: ReactNode[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  let inCode = false;
  let codeLines: string[] = [];

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(renderCodeBlock(codeLines.join("\n"), `code-${index}`));
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      index += 1;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      index += 1;
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.slice(4);
      blocks.push(
        <h3 key={`h3-${index}`} className="flous-docs-h3" id={slugifyHeading(text)}>
          {renderRichText(text, `h3-${index}`)}
        </h3>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3);
      blocks.push(
        <h2 key={`h2-${index}`} className="flous-docs-h2" id={slugifyHeading(text)}>
          {renderRichText(text, `h2-${index}`)}
        </h2>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: ReactNode[] = [];
      while (index < lines.length && (lines[index].startsWith("- ") || lines[index].startsWith("* "))) {
        items.push(
          <li key={`li-${index}`}>{renderRichText(lines[index].slice(2), `li-${index}`)}</li>
        );
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="flous-docs-ul">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(
          <li key={`oli-${index}`}>
            {renderRichText(lines[index].replace(/^\d+\.\s/, ""), `oli-${index}`)}
          </li>
        );
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="flous-docs-ol">
          {items}
        </ol>
      );
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const tableLines: string[] = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderTable(tableLines, index));
      continue;
    }

    const paraLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ") &&
      !lines[index].startsWith("* ") &&
      !/^\d+\.\s/.test(lines[index]) &&
      !lines[index].startsWith("```") &&
      !/^\|.+\|$/.test(lines[index].trim())
    ) {
      paraLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="flous-docs-p">
        {renderRichText(paraLines.join(" "), `p-${index}`)}
      </p>
    );
  }

  if (inCode && codeLines.length) {
    blocks.push(renderCodeBlock(codeLines.join("\n"), "code-tail"));
  }

  return <article className="flous-docs-article-body">{blocks}</article>;
}

export { slugifyHeading };

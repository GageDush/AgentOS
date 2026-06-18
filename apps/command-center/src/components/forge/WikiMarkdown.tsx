"use client";

import type { ReactNode } from "react";

type WikiMarkdownProps = {
  body: string;
  onNavigate: (slug: string, anchor?: string) => void;
};

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

function renderInline(text: string, onNavigate: (slug: string, anchor?: string) => void): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_RE.source, "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const slug = match[1].trim();
    const anchor = match[2]?.trim();
    const label = match[3]?.trim() ?? slug;
    parts.push(
      <button
        key={`${match.index}-${slug}`}
        type="button"
        className="forge-wiki-link"
        onClick={() => onNavigate(slug, anchor)}
      >
        {label}
      </button>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}

function renderCodeBlock(code: string, key: string) {
  return (
    <pre key={key} className="forge-wiki-pre">
      <code>{code}</code>
    </pre>
  );
}

export function WikiMarkdown({ body, onNavigate }: WikiMarkdownProps) {
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

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${index}`} className="forge-wiki-h3" id={slugifyHeading(line.slice(4))}>
          {renderInline(line.slice(4), onNavigate)}
        </h3>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${index}`} className="forge-wiki-h2" id={slugifyHeading(line.slice(3))}>
          {renderInline(line.slice(3), onNavigate)}
        </h2>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${index}`} className="forge-wiki-h1" id={slugifyHeading(line.slice(2))}>
          {renderInline(line.slice(2), onNavigate)}
        </h1>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: ReactNode[] = [];
      while (index < lines.length && (lines[index].startsWith("- ") || lines[index].startsWith("* "))) {
        items.push(
          <li key={`li-${index}`}>{renderInline(lines[index].slice(2), onNavigate)}</li>
        );
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="forge-wiki-ul">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const tableLines: string[] = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderTable(tableLines, index, onNavigate));
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
      !lines[index].startsWith("```") &&
      !/^\|.+\|$/.test(lines[index].trim())
    ) {
      paraLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="forge-wiki-p">
        {renderInline(paraLines.join(" "), onNavigate)}
      </p>
    );
  }

  if (inCode && codeLines.length) {
    blocks.push(renderCodeBlock(codeLines.join("\n"), "code-tail"));
  }

  return <article className="forge-wiki-article-body">{blocks}</article>;
}

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function renderTable(rows: string[], key: number, onNavigate: (slug: string, anchor?: string) => void) {
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
    <div key={`table-${key}`} className="forge-wiki-table-wrap">
      <table className="forge-wiki-table">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th key={i}>{renderInline(cell, onNavigate)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{renderInline(cell, onNavigate)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

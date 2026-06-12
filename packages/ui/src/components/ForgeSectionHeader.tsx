"use client";

import type { ReactNode } from "react";

type ForgeSectionHeaderProps = {
  kicker: string;
  title: string;
  accentWord?: string;
  copy?: string;
  actions?: ReactNode;
};

export function ForgeSectionHeader({ kicker, title, accentWord, copy, actions }: ForgeSectionHeaderProps) {
  const titleParts = accentWord && title.includes(accentWord) ? title.split(accentWord) : null;

  return (
    <header className="forge-section-header">
      <div className="forge-section-header-row">
        <div>
          <p className="forge-section-header-kicker">{kicker}</p>
          <h2 className="forge-section-header-title">
            {titleParts ? (
              <>
                {titleParts[0]}
                <span className="forge-section-header-accent">{accentWord}</span>
                {titleParts[1]}
              </>
            ) : (
              title
            )}
          </h2>
          {copy ? <p className="forge-section-header-copy">{copy}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}

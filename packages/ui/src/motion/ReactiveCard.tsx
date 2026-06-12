"use client";

import { type HTMLAttributes, type ReactNode } from "react";

type ReactiveCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "section" | "article" | "div";
};

export function ReactiveCard({ children, as: Tag = "section", className = "", ...props }: ReactiveCardProps) {
  return (
    <Tag
      className={`forge-panel forge-reactive ${className}`.trim()}
      data-forge-proximity="true"
      {...props}
    >
      {children}
    </Tag>
  );
}

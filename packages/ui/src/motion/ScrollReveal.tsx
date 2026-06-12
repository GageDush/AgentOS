"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useScrollReveal } from "./useScrollReveal";

type ScrollRevealProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  staggerIndex?: number;
  staggerMs?: number;
  disabled?: boolean;
};

export function ScrollReveal({
  children,
  staggerIndex = 0,
  staggerMs = 70,
  disabled = false,
  className = "",
  ...props
}: ScrollRevealProps) {
  const { ref, className: revealClass } = useScrollReveal<HTMLDivElement>({
    staggerIndex,
    staggerMs,
    disabled
  });

  return (
    <div ref={ref} className={`${revealClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

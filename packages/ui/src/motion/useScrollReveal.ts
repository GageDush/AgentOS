"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type UseScrollRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  staggerMs?: number;
  staggerIndex?: number;
  disabled?: boolean;
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): { ref: RefObject<T | null>; visible: boolean; className: string } {
  const { threshold = 0.12, rootMargin = "0px 0px -8% 0px", staggerMs = 0, staggerIndex = 0, disabled = false } = options;
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(disabled);

  useEffect(() => {
    if (disabled) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const delay = staggerMs * staggerIndex;
        timer = setTimeout(() => {
          setVisible(true);
          observer.disconnect();
        }, delay);
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [disabled, rootMargin, staggerIndex, staggerMs, threshold]);

  return {
    ref,
    visible,
    className: `forge-scroll-reveal ${visible ? "forge-scroll-reveal-visible" : ""}`.trim()
  };
}

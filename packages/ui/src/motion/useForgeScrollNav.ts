"use client";

import { useEffect, useState } from "react";

type ForgeScrollNavState = {
  scrolled: boolean;
  hidden: boolean;
  direction: "up" | "down" | "idle";
};

const TOP_THRESHOLD = 48;
const SCROLL_DELTA = 6;

export function useForgeScrollNav(): ForgeScrollNavState {
  const [state, setState] = useState<ForgeScrollNavState>({
    scrolled: false,
    hidden: false,
    direction: "idle"
  });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      const scrolled = y > TOP_THRESHOLD;

      setState((current) => {
        let hidden = current.hidden;
        let direction: ForgeScrollNavState["direction"] = "idle";

        if (y <= TOP_THRESHOLD) {
          hidden = false;
        } else if (delta > SCROLL_DELTA) {
          hidden = true;
          direction = "down";
        } else if (delta < -SCROLL_DELTA) {
          hidden = false;
          direction = "up";
        }

        lastY = y;
        document.documentElement.dataset.forgeNavScrolled = scrolled ? "true" : "false";
        document.documentElement.dataset.forgeNavHidden = hidden ? "true" : "false";
        return { scrolled, hidden, direction };
      });
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return state;
}

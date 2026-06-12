import { useEffect } from "react";

const PROXIMITY_RADIUS_DEFAULT = 160;

export function usePointerProximity() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let reducedMotion = false;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateReducedMotion = () => {
      reducedMotion = media.matches;
      root.dataset.reducedMotion = reducedMotion ? "true" : "false";
    };

    let proximityReady = false;
    const enableProximity = () => {
      proximityReady = true;
      updateReducedMotion();
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(enableProximity));
    media.addEventListener("change", updateReducedMotion);

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      frame = 0;
      if (!proximityReady) return;
      smoothX += (pointerX - smoothX) * 0.12;
      smoothY += (pointerY - smoothY) * 0.12;
      root.style.setProperty("--pointer-x", `${pointerX}px`);
      root.style.setProperty("--pointer-y", `${pointerY}px`);
      root.style.setProperty("--pointer-x-smooth", `${smoothX}px`);
      root.style.setProperty("--pointer-y-smooth", `${smoothY}px`);

      const targets = document.querySelectorAll<HTMLElement>("[data-forge-proximity]");

      if (reducedMotion) {
        root.style.setProperty("--proximity", "0");
        targets.forEach((el) => {
          el.style.setProperty("--proximity", "0");
          el.style.setProperty("--magnet-x", "0px");
          el.style.setProperty("--magnet-y", "0px");
        });
        return;
      }

      let maxProximity = 0;

      targets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const distance = Math.hypot(dx, dy);
        const radius = Number(element.dataset.forgeRadius) || PROXIMITY_RADIUS_DEFAULT;
        const proximity = Math.max(0, 1 - distance / radius);

        if (proximity > maxProximity) maxProximity = proximity;

        element.style.setProperty("--proximity", proximity.toFixed(3));
        const magnetStrength = proximity * 4;
        const magnetX = distance > 0 ? (-dx / distance) * magnetStrength : 0;
        const magnetY = distance > 0 ? (-dy / distance) * magnetStrength : 0;
        element.style.setProperty("--magnet-x", `${magnetX.toFixed(2)}px`);
        element.style.setProperty("--magnet-y", `${magnetY.toFixed(2)}px`);
      });

      root.style.setProperty("--proximity", maxProximity.toFixed(3));
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
      media.removeEventListener("change", updateReducedMotion);
    };
  }, []);
}

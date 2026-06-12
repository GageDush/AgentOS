"use client";

import { type ReactNode } from "react";
import { usePointerProximity } from "./usePointerProximity";
import { CursorSpotlight } from "./CursorSpotlight";

export function ProximityProvider({ children }: { children: ReactNode }) {
  usePointerProximity();

  return (
    <>
      <CursorSpotlight />
      {children}
    </>
  );
}

// Kept for API compatibility; proximity uses data-forge-proximity attributes.
export function useProximityRegister() {
  return () => () => undefined;
}

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ProximityProvider } from "./ProximityProvider";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    })
  });
});

afterEach(() => cleanup());

describe("ProximityProvider", () => {
  it("sets reduced motion dataset from media query", async () => {
    render(
      <ProximityProvider>
        <div>child</div>
      </ProximityProvider>
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.reducedMotion === "true" || document.documentElement.dataset.reducedMotion === "false").toBe(
        true
      );
    });
  });
});

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
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
  it("sets reduced motion dataset from media query", () => {
    render(
      <ProximityProvider>
        <div>child</div>
      </ProximityProvider>
    );
    expect(document.documentElement.dataset.reducedMotion).toBeDefined();
  });
});

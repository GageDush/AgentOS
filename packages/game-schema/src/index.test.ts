import { describe, expect, it } from "vitest";
import { officeInteractables } from "./index";

describe("office interactables", () => {
  it("contains the required MVP clickable zones", () => {
    expect(officeInteractables.length).toBeGreaterThanOrEqual(12);
    expect(officeInteractables.some((item) => item.panel === "TokenManagerPanel")).toBe(true);
    expect(officeInteractables.some((item) => item.panel === "MemoryPanel")).toBe(true);
  });
});

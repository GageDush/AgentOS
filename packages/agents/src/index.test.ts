import { describe, expect, it } from "vitest";
import { loadInstalledAgentProfiles } from "./index";

describe("installed agent profiles", () => {
  it("loads the registry and profiles from .agentos", () => {
    const installed = loadInstalledAgentProfiles();
    expect(installed.registry.coreAgents.length).toBeGreaterThan(5);
    expect(installed.profiles.some((profile) => profile.id === "task-classifier")).toBe(true);
  });
});

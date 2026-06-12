import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadInstalledAgentProfiles } from "@agentos/agents";
import { determineMissionRoute } from "./index";

type PipelineMission = {
  id: string;
  title: string;
  prompt: string;
  command: string;
  expectPrimary: string;
  maxSupporting?: number;
  requiredGates?: string[];
};

function existsBenchRoot() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, ".agentos", "benchmarks", "pipeline-missions.json"))) return cwd;
  return join(cwd, "..", "..");
}

function loadMissions() {
  const repoRoot = existsBenchRoot();
  const path = join(repoRoot, ".agentos", "benchmarks", "pipeline-missions.json");
  return JSON.parse(readFileSync(path, "utf8")).missions as PipelineMission[];
}

describe("pipeline mission benchmarks", () => {
  const installed = loadInstalledAgentProfiles();

  for (const mission of loadMissions()) {
    it(`routes ${mission.id} to ${mission.expectPrimary}`, () => {
      const route = determineMissionRoute(installed, {
        id: `bench-${mission.id}`,
        workspaceId: "workspace-local",
        title: mission.title,
        objective: mission.prompt,
        prompt: mission.prompt,
        command: mission.command
      });
      expect(route.selectedPrimaryAgentId).toBe(mission.expectPrimary);
      if (mission.maxSupporting !== undefined) {
        expect(route.supportingAgentIds.length).toBeLessThanOrEqual(mission.maxSupporting);
      }
      for (const gate of mission.requiredGates ?? []) {
        expect(route.requiredGates).toContain(gate);
      }
    });
  }
});

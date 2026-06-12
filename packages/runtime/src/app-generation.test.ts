import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseBuildIntent } from "@agentos/orchestrator";
import { scaffoldApp } from "@agentos/app-generator";
import { readBuildIntent } from "./app-generation";
import type { MissionRecord } from "@agentos/shared";

describe("app generation", () => {
  it("reads build intent from mission metadata", () => {
    const intent = parseBuildIntent("Build me a news reader app");
    const mission = {
      id: "mission-1",
      title: "News app",
      objective: "Build app",
      prompt: "Build me a news reader app",
      metadata: { buildIntent: intent, questionnaireAnswers: { "app-name": "Nebraska News" } }
    } as unknown as MissionRecord;

    const read = readBuildIntent(mission);
    expect(read.taskType).toBe("app_creation");
    expect(read.answers?.["app-name"]).toBe("Nebraska News");
  });

  it("scaffolds output files under AGENTOS_OUTPUT_DIR", () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "agentos-out-"));
    process.env.AGENTOS_OUTPUT_DIR = outputRoot;
    const intent = parseBuildIntent("Build me a standalone weather app");
    const result = scaffoldApp(intent, "mission-test");
    expect(existsSync(join(result.outputDir, "app/page.tsx"))).toBe(true);
    const page = readFileSync(join(result.outputDir, "app/page.tsx"), "utf8");
    expect(page).toContain("GeneratedAppPage");
    delete process.env.AGENTOS_OUTPUT_DIR;
  });
});

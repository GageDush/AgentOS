import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveOutputDir, scaffoldApp } from "./scaffold";

describe("scaffoldApp", () => {
  it("writes app files outside monorepo", () => {
    const missionId = `test-mission-${Date.now()}`;
    process.env.AGENTOS_OUTPUT_DIR = join(process.cwd(), ".tmp-test-outputs");
    const result = scaffoldApp(
      {
        intentId: "i-1",
        taskType: "app_creation",
        appName: "News Hub",
        summary: "Track Nebraska news",
        questionnaire: [],
        answers: { audience: "personal" }
      },
      missionId
    );
    expect(result.files).toContain("app/page.tsx");
    expect(existsSync(join(result.outputDir, "package.json"))).toBe(true);
    expect(resolveOutputDir(missionId)).toBe(result.outputDir);
    rmSync(process.env.AGENTOS_OUTPUT_DIR, { recursive: true, force: true });
  });
});

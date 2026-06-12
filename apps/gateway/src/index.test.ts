import { describe, expect, it } from "vitest";
import { assessCommandPolicy } from "@agentos/sandbox";

describe("gateway allow-list policy", () => {
  it("allows safe read-only commands", () => {
    expect(assessCommandPolicy("git status").permissionLevel).toBe("safe_execute");
    expect(assessCommandPolicy("pnpm typecheck").permissionLevel).toBe("safe_execute");
  });

  it("requires approval for install", () => {
    expect(assessCommandPolicy("pnpm install").permissionLevel).not.toBe("safe_execute");
  });

  it("denies destructive commands", () => {
    expect(["denied", "system_elevated"]).toContain(assessCommandPolicy("sudo rm -rf /").permissionLevel);
  });
});

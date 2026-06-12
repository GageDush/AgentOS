import { describe, expect, it } from "vitest";
import { assessCommandPolicy } from "./index";

describe("assessCommandPolicy", () => {
  it("auto-allows safe commands", () => {
    expect(assessCommandPolicy("git log").policy).toBe("auto_allowed");
    expect(assessCommandPolicy("pnpm build").policy).toBe("auto_allowed");
  });

  it("requires approval for install", () => {
    expect(assessCommandPolicy("pnpm install").policy).toBe("approval_required");
  });
});

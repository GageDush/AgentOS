import { describe, expect, it } from "vitest";
import { assessCommandPolicy, AUTO_ALLOWED_COMMANDS } from "@agentos/sandbox";
import { GATEWAY_COMMAND_ALIASES } from "./command-aliases.js";

describe("gateway ↔ sandbox command parity", () => {
  it("keeps gateway aliases aligned with sandbox auto-allow list", () => {
    const gateway = new Set(GATEWAY_COMMAND_ALIASES);
    const sandbox = new Set(AUTO_ALLOWED_COMMANDS);

    expect([...gateway].sort()).toEqual([...sandbox].sort());
  });

  it("auto-allows every gateway alias via sandbox policy", () => {
    for (const command of GATEWAY_COMMAND_ALIASES) {
      const decision = assessCommandPolicy(command);
      expect(decision.policy, command).toBe("auto_allowed");
    }
  });
});

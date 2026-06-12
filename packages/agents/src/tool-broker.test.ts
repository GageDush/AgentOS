import { describe, expect, it } from "vitest";
import { isToolExecutionEnabled } from "./tool-broker";

describe("tool-broker", () => {
  it("is disabled by default", () => {
    const prev = process.env.FEATURE_TOOL_EXECUTION;
    delete process.env.FEATURE_TOOL_EXECUTION;
    expect(isToolExecutionEnabled()).toBe(false);
    if (prev !== undefined) process.env.FEATURE_TOOL_EXECUTION = prev;
  });

  it("enables when FEATURE_TOOL_EXECUTION=true", () => {
    const prev = process.env.FEATURE_TOOL_EXECUTION;
    process.env.FEATURE_TOOL_EXECUTION = "true";
    expect(isToolExecutionEnabled()).toBe(true);
    if (prev === undefined) delete process.env.FEATURE_TOOL_EXECUTION;
    else process.env.FEATURE_TOOL_EXECUTION = prev;
  });
});

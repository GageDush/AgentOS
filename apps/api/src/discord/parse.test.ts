import { describe, expect, it } from "vitest";
import { parseAgentOsCommand } from "./parse";

describe("parseAgentOsCommand", () => {
  it("parses nested agentos subcommands", () => {
    const parsed = parseAgentOsCommand({
      name: "agentos",
      options: [{ name: "chat", options: [{ name: "message", value: "hello" }] }]
    });
    expect(parsed).toEqual({
      subcommand: "chat",
      options: [{ name: "message", value: "hello" }]
    });
  });

  it("accepts legacy top-level commands", () => {
    const parsed = parseAgentOsCommand({ name: "status", options: [] });
    expect(parsed?.subcommand).toBe("status");
  });
});

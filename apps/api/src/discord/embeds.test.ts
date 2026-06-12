import { describe, expect, it } from "vitest";
import { buildAgentEmbed, withSeenState } from "./embeds";
import { SEEN_EMOJI } from "./theme";

describe("discord embeds", () => {
  it("builds futuristic agent embed with awaiting footer", () => {
    const embed = buildAgentEmbed({
      agentId: "admin-agent",
      title: "Control gate",
      description: "Requesting approval.",
      fields: [{ name: "Tool", value: "terminal.run" }]
    });
    expect(embed.title).toBe("Control gate");
    expect(embed.author?.name).toContain("[Admin] Ash");
    expect(embed.footer?.text).toContain("AgentOS");
  });

  it("marks embed as seen with eye indicator", () => {
    const embed = buildAgentEmbed({ title: "Ping" });
    const seen = withSeenState(embed, "Gage", "2026-06-11T00:00:00.000Z");
    expect(seen.footer?.text).toContain(SEEN_EMOJI);
    expect(seen.footer?.text).toContain("Gage");
  });
});

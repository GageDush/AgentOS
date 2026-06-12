import { describe, expect, it } from "vitest";
import { buildAgentEmbed, withSeenState } from "./embeds";
import { SEEN_EMOJI } from "./theme";

describe("discord embeds", () => {
  it("builds HQ placard embed with portrait and ops layout", () => {
    const embed = buildAgentEmbed({
      agentId: "admin-agent",
      thumbnailUrl: "https://example.com/agents/admin.png",
      title: "Audit signal",
      description: "Gateway implementer dispatch failed on `pnpm typecheck`.",
      lane: "Ops Feed",
      fields: [
        { name: "Event", value: "agent.step_executed", inline: true },
        { name: "Actor", value: "code-implementer", inline: true },
        { name: "Mission", value: "mission-1781276254815-9a9397", inline: false }
      ]
    });
    expect(embed.title).toBe("🛡️ OPS SIGNAL");
    expect(embed.author?.name).toBe("AgentOS HQ • Ops Feed");
    expect(embed.thumbnail?.url).toBeTruthy();
    expect(embed.fields?.find((field) => field.name === "🎯 MISSION")?.inline).toBe(false);
    expect(embed.footer?.text).toContain("SECURE. COORDINATE. DEPLOY.");
  });

  it("builds legacy embed when requested", () => {
    const embed = buildAgentEmbed({
      agentId: "admin-agent",
      title: "Control gate",
      description: "Requesting approval.",
      legacyEmbed: true,
      fields: [{ name: "Tool", value: "terminal.run" }]
    });
    expect(embed.title).toBe("Control gate");
    expect(embed.author?.name).toContain("[Admin] Ash");
  });

  it("marks embed as seen with eye indicator", () => {
    const embed = buildAgentEmbed({ title: "Ping" });
    const seen = withSeenState(embed, "Gage", "2026-06-11T00:00:00.000Z");
    expect(seen.footer?.text).toContain(SEEN_EMOJI);
    expect(seen.footer?.text).toContain("Gage");
  });
});

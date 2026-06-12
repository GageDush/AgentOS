import { describe, expect, it } from "vitest";
import {
  AGENT_RICH_QUICK_ACTION_BY_TYPE,
  AGENT_RICH_QUICK_ACTIONS,
  ASH_ADMIN_PROFILE,
  buildAgentDestination,
  buildAgentDiscordEmbed,
  buildAgentPlainTextMessage,
  buildAgentRichEmbed,
  buildAshAdminRichMessage,
  formatAgentRichQuickActions
} from "./agent-rich-message";

describe("agent rich message builder", () => {
  const sample = buildAshAdminRichMessage("Gage", "Message Context/Request");

  it("generates Admin Ash embed payload", () => {
    const payload = buildAgentDiscordEmbed(sample);
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0]?.author?.name).toBe("[Admin] Ash");
    expect(payload.embeds[0]?.title).toBe("Ash");
  });

  it("includes job title, destination, and message body", () => {
    const embed = buildAgentRichEmbed(sample);
    expect(embed.description).toContain("**Admin**");
    expect(embed.description).toContain("**Destination:** `[Ash -> Gage]`");
    expect(embed.description).toContain('> "Message Context/Request"');
  });

  it("includes profile, status, routing, and response fields", () => {
    const embed = buildAgentRichEmbed(sample);
    const names = embed.fields?.map((field) => field.name) ?? [];
    expect(names).toEqual(["Profile", "Status", "Routing", "Available Responses"]);
    expect(embed.fields?.find((field) => field.name === "Status")?.value).toBe("`Awaiting response`");
    expect(embed.fields?.find((field) => field.name === "Routing")?.value).toBe("`AgentOS Local`");
  });

  it("includes all required quick-action emojis", () => {
    const responses = formatAgentRichQuickActions();
    for (const action of AGENT_RICH_QUICK_ACTIONS) {
      expect(responses).toContain(action.emoji);
    }
  });

  it("builds stable quick-action mappings", () => {
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.approve).toEqual({
      type: "approve",
      emoji: "✅",
      label: "Yes",
      description: "Yes / approve"
    });
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.deny.emoji).toBe("❌");
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.request_more_information.emoji).toBe("ℹ️");
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.agent_received_response.emoji).toBe("📥");
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.agent_responding.emoji).toBe("✍️");
    expect(AGENT_RICH_QUICK_ACTION_BY_TYPE.agent_completed_task.emoji).toBe("🏁");
  });

  it("formats plain-text fallback with the same core information", () => {
    const plain = buildAgentPlainTextMessage(sample);
    expect(plain).toContain("**[Admin] Ash**");
    expect(plain).toContain("*Admin • AgentOS Control Layer*");
    expect(plain).toContain("**Destination:** `[Ash -> Gage]`");
    expect(plain).toContain('> "Message Context/Request"');
    expect(plain).toContain("✅ Yes");
    expect(plain).toContain("🏁 Task Complete");
  });

  it("builds destination labels from display names", () => {
    expect(buildAgentDestination(ASH_ADMIN_PROFILE.displayName, "Gage")).toBe("[Ash -> Gage]");
  });
});

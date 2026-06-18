import { describe, expect, it } from "vitest";
import {
  agentJournalWikiSlug,
  agentWikiArticleUrl,
  buildAgentHouseSpecs,
  houseChannelName,
  houseGuideEmbed
} from "./agent-houses";
import { ROSTER_PERSONAS } from "./personas";

describe("agent houses", () => {
  it("builds one house per roster persona", () => {
    const specs = buildAgentHouseSpecs();
    expect(specs.length).toBe(ROSTER_PERSONAS.length);
    expect(specs.map((spec) => spec.channelName)).toContain("ash-house");
    expect(specs.map((spec) => spec.channelName)).toContain("brock-house");
  });

  it("maps wiki journal slugs and API links", () => {
    expect(agentJournalWikiSlug("admin-agent")).toBe("agents/admin-agent/journal");
    expect(agentWikiArticleUrl("https://api.flous.dev", "admin-agent")).toBe(
      "https://api.flous.dev/memory/wiki/article?slug=agents%2Fadmin-agent%2Fjournal"
    );
  });

  it("formats house channel names from character names", () => {
    const ash = ROSTER_PERSONAS.find((persona) => persona.agentId === "admin-agent");
    expect(ash).toBeTruthy();
    expect(houseChannelName(ash!)).toBe("ash-house");
  });

  it("includes wiki link in house guide embed", () => {
    const spec = buildAgentHouseSpecs().find((item) => item.agentId === "admin-agent");
    expect(spec).toBeTruthy();
    const embed = houseGuideEmbed({
      spec: spec!,
      apiBaseUrl: "https://api.flous.dev",
      publicAppUrl: "https://flous.dev"
    });
    expect(embed.fields?.some((field) => field.name === "Wiki journal")).toBe(true);
    expect(embed.fields?.find((field) => field.name === "Wiki journal")?.value).toContain(
      "agents/admin-agent/journal"
    );
  });
});

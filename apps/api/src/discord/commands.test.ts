import { describe, expect, it, vi } from "vitest";

vi.mock("./messenger", () => ({
  embedInteractionResponse: vi.fn((input: { title: string }) => ({
    type: 4,
    data: { embeds: [{ title: input.title }] }
  }))
}));

describe("discord commands", () => {
  it("handles agentos status slash command", async () => {
    const { handleSlashCommand } = await import("./commands");
    const response = await handleSlashCommand(
      { name: "agentos", options: [{ name: "status", type: 1 }] },
      "Tester",
      "discord-1"
    );
    expect(response).toBeTruthy();
  });
});

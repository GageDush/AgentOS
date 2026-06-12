import { describe, expect, it } from "vitest";
import { renderAuthLoginRequiredPage, renderAuthSuccessPage } from "./auth-pages";
import type { OperatorSession } from "./session";

const session: OperatorSession = {
  provider: "discord",
  discordUserId: "449600988094136343",
  username: "v1vx_real",
  globalName: "V1vx",
  avatar: "abc123",
  operatorId: "discord-449600988094136343",
  issuedAt: "2026-06-11T21:00:00.000Z"
};

describe("auth-pages", () => {
  it("renders dark themed success page with operator details", () => {
    const html = renderAuthSuccessPage(session, "https://app.flous.dev");
    expect(html).toContain('color-scheme: dark');
    expect(html).toContain("Operator authenticated");
    expect(html).toContain("V1vx");
    expect(html).toContain("https://app.flous.dev");
    expect(html).toContain("discord-449600988094136343");
  });

  it("escapes unsafe html in operator fields", () => {
    const unsafe = { ...session, username: "<script>alert(1)</script>", globalName: "<img onerror=alert(1)>" };
    const html = renderAuthSuccessPage(unsafe, "https://app.flous.dev");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders login required page with discord link", () => {
    const html = renderAuthLoginRequiredPage("https://api.flous.dev");
    expect(html).toContain("Continue with Discord");
    expect(html).toContain("https://api.flous.dev/auth/discord");
  });
});

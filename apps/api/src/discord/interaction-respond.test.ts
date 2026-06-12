import { describe, expect, it, vi } from "vitest";
import {
  claimInteraction,
  finishDeferredInteraction,
  isDeferredInteractionWork,
  postInteractionCallback
} from "./interaction-respond";

describe("interaction-respond", () => {
  it("claims interaction ids once per minute window", () => {
    expect(claimInteraction("claim-a")).toBe(true);
    expect(claimInteraction("claim-a")).toBe(false);
    expect(claimInteraction("claim-b")).toBe(true);
  });

  it("detects deferred interaction work", () => {
    expect(isDeferredInteractionWork({ deferred: true, applicationId: "a", token: "t", run: async () => ({}) })).toBe(
      true
    );
    expect(isDeferredInteractionWork({ type: 4 })).toBe(false);
  });

  it("posts interaction callbacks", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);
    await postInteractionCallback("id-1", "token-1", { type: 4, data: { content: "ok" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/interactions/id-1/token-1/callback",
      expect.objectContaining({ method: "POST" })
    );
    vi.unstubAllGlobals();
  });

  it("finishes deferred interaction edits", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);
    await finishDeferredInteraction({
      deferred: true,
      applicationId: "app",
      token: "tok",
      run: async () => ({ content: "done" })
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/webhooks/app/tok/messages/@original",
      expect.objectContaining({ method: "PATCH" })
    );
    vi.unstubAllGlobals();
  });
});

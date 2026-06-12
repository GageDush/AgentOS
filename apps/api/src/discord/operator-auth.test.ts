import { afterEach, describe, expect, it } from "vitest";
import { getAuthorizedOperatorDiscordIds, isAuthorizedDiscordOperator } from "./operator-auth";

describe("operator-auth", () => {
  afterEach(() => {
    delete process.env.DISCORD_OWNER_USER_ID;
    delete process.env.DISCORD_OPERATOR_USER_IDS;
  });

  it("returns false when owner is not configured", () => {
    expect(isAuthorizedDiscordOperator("123")).toBe(false);
  });

  it("authorizes configured owner and extras", () => {
    process.env.DISCORD_OWNER_USER_ID = "111";
    process.env.DISCORD_OPERATOR_USER_IDS = "222,333";
    expect(getAuthorizedOperatorDiscordIds()).toEqual(["111", "222", "333"]);
    expect(isAuthorizedDiscordOperator("111")).toBe(true);
    expect(isAuthorizedDiscordOperator("999")).toBe(false);
  });
});

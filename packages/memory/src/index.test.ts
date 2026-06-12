import { describe, expect, it } from "vitest";
import { createMemory, rankMemories, searchMemories } from "./index";

describe("memory", () => {
  it("searches by keyword", () => {
    const memories = [
      createMemory({ title: "Nebraska law", content: "Legislation update", tags: ["news"] }),
      createMemory({ title: "Typecheck", content: "pnpm typecheck passed", tags: ["qa"] })
    ];
    const hits = searchMemories(memories, "nebraska");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.title).toBe("Nebraska law");
  });

  it("ranks by title match and importance", () => {
    const memories = [
      createMemory({ title: "Low", content: "misc", importance: 1 }),
      createMemory({ title: "Gateway tools", content: "git diff status", importance: 3, tags: ["p1"] })
    ];
    const ranked = rankMemories(memories, "gateway");
    expect(ranked[0]?.title).toBe("Gateway tools");
  });
});

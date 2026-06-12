import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  buildSessionWikiBody,
  listCursorTranscriptFiles,
  parseCursorJsonl,
  summarizeCursorTranscript
} from "./cursor-transcripts";
import { redactSecrets } from "./redact";
import { syncCursorSessionsToWiki } from "./cursor-sync";

const sampleJsonl = `{"role":"user","message":{"content":[{"type":"text","text":"<user_query>\\nFix packages/runtime gates\\n</user_query>"}]}}
{"role":"assistant","message":{"content":[{"type":"text","text":"Updated packages/runtime/src/index.ts gate flow."},{"type":"tool_use","name":"Read","input":{"path":"packages/runtime/src/index.ts"}}]}}
`;

describe("cursor transcripts", () => {
  it("redacts secret patterns", () => {
    expect(redactSecrets("token gho_abc123xyz")).toContain("[REDACTED_GH_TOKEN]");
  });

  it("parses jsonl and summarizes session", () => {
    const entries = parseCursorJsonl(sampleJsonl);
    expect(entries.length).toBeGreaterThan(0);

    const summary = summarizeCursorTranscript(
      "sess-1",
      "sess-1/sess-1.jsonl",
      entries,
      new Date().toISOString()
    );

    expect(summary.title).toContain("Fix packages/runtime gates");
    expect(summary.packagesMentioned).toContain("packages/runtime");
    expect(summary.userGoals.length).toBeGreaterThan(0);
  });

  it("syncs transcript files into wiki articles", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-cursor-wiki-"));
    const transcriptsDir = join(repoRoot, "cursor-transcripts");
    const sessionDir = join(transcriptsDir, "abc-123");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, "abc-123.jsonl"), sampleJsonl, "utf8");

    const result = syncCursorSessionsToWiki(repoRoot, {
      full: true,
      transcriptsDir,
      applyCrossLinks: false
    });

    expect(result.indexed).toBe(1);
    expect(result.sessionSlugs).toContain("sessions/cursor/abc-123");

    const body = buildSessionWikiBody(
      summarizeCursorTranscript(
        "abc-123",
        "abc-123/abc-123.jsonl",
        parseCursorJsonl(sampleJsonl),
        new Date().toISOString()
      )
    );
    expect(body).toContain("packages/runtime");
    expect(body).not.toMatch(/gho_/);

    const listed = listCursorTranscriptFiles(transcriptsDir);
    expect(listed).toHaveLength(1);
  });
});

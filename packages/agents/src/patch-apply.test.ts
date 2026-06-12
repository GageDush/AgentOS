import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { applyUnifiedDiff, extractUnifiedDiffFromText } from "./patch-apply";

describe("patch-apply", () => {
  const roots: string[] = [];

  afterEach(() => {
    roots.length = 0;
  });

  function tempRepo(filePath: string, content: string) {
    const root = mkdtempSync(join(tmpdir(), "agentos-patch-"));
    roots.push(root);
    const absolute = join(root, filePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, "utf8");
    return root;
  }

  it("extracts fenced diff blocks", () => {
    const text = "Here is the fix:\n```diff\n@@ -1 +1 @@\n-old\n+new\n```";
    expect(extractUnifiedDiffFromText(text)).toContain("@@");
  });

  it("applies a single-file hunk", () => {
    const root = tempRepo("packages/demo/src/a.ts", "line one\nline two\n");
    const diff = [
      "diff --git a/packages/demo/src/a.ts b/packages/demo/src/a.ts",
      "index 1111111..2222222 100644",
      "--- a/packages/demo/src/a.ts",
      "+++ b/packages/demo/src/a.ts",
      "@@ -1,2 +1,2 @@",
      " line one",
      "-line two",
      "+line updated",
      ""
    ].join("\n");

    const result = applyUnifiedDiff(diff, root, ["packages/demo"]);
    expect(result.ok).toBe(true);
    expect(result.changedFiles).toContain("packages/demo/src/a.ts");
    expect(readFileSync(join(root, "packages/demo/src/a.ts"), "utf8")).toContain("line updated");
  });
});

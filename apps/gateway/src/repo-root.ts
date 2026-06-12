import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Resolve AgentOS monorepo root (package name `agentos`). */
export function resolveGatewayRepoRoot(start = process.cwd()) {
  const envRoot = process.env.AGENTOS_REPO_ROOT?.trim();
  if (envRoot && existsSync(join(envRoot, "package.json"))) {
    return envRoot;
  }

  let current = start;
  for (let depth = 0; depth < 12; depth += 1) {
    const pkgPath = join(current, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (parsed.name === "agentos") return current;
      } catch {
        /* continue walking */
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return start;
}

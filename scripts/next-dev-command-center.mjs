import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(repoRoot, "apps", "command-center");

function readPort() {
  const overridePath = join(repoRoot, ".agentos", "state", "command-center-port.override");
  if (existsSync(overridePath)) {
    const parsed = Number.parseInt(readFileSync(overridePath, "utf8").trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const envPath = join(repoRoot, ".env");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^AGENTOS_COMMAND_CENTER_PORT=(\d+)/m);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }

  return 3000;
}

const port = readPort();
const child = spawn("npx", ["next", "dev", "--turbo", "-p", String(port)], {
  cwd: appDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, AGENTOS_COMMAND_CENTER_PORT: String(port), PORT: String(port) },
});

child.on("exit", (code) => process.exit(code ?? 0));

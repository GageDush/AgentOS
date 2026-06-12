import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadRootEnv() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    if (process.env[key]) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadRootEnv();

const nextConfig = {
  transpilePackages: ["@agentos/shared", "@agentos/game-schema", "@agentos/ui", "@agentos/app-generator"],
  env: {
    NEXT_PUBLIC_AGENTOS_API_URL:
      process.env.NEXT_PUBLIC_AGENTOS_API_URL?.trim() ||
      process.env.AGENTOS_API_BASE_URL?.trim() ||
      "http://localhost:8787"
  }
};

export default nextConfig;

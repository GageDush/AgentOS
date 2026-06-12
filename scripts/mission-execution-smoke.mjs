import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const gatewayUrl = process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790";

async function probeGateway() {
  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

console.log("AgentOS mission execution smoke\n");

const gatewayLive = await probeGateway();
if (gatewayLive) {
  console.log(`Gateway: live at ${gatewayUrl}`);
} else {
  console.log(`Gateway: not reachable at ${gatewayUrl} (vitest smoke uses mocked gateway fetch)`);
}

const vitest = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "packages/runtime/src/mission-execution-smoke.test.ts"],
  { cwd: repoRoot, stdio: "inherit", shell: true }
);

if ((vitest.status ?? 1) !== 0) {
  process.exit(vitest.status ?? 1);
}

console.log("\nMission execution smoke: PASS");

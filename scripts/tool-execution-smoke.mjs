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

console.log("AgentOS tool execution smoke\n");

const gatewayLive = await probeGateway();
if (gatewayLive) {
  console.log(`Gateway: live at ${gatewayUrl}`);
} else {
  console.log(`Gateway: not reachable at ${gatewayUrl} (vitest uses mocked gateway fetch)`);
}

const targets = [
  "packages/agents/src/tool-execution-golden-path.test.ts",
  "packages/runtime/src/mission-execution-smoke.test.ts"
];

let exitCode = 0;
for (const target of targets) {
  console.log(`\n> vitest run ${target}`);
  const vitest = spawnSync("pnpm", ["exec", "vitest", "run", target], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true
  });
  exitCode |= vitest.status ?? 1;
}

if (exitCode === 0) {
  console.log("\nTool execution smoke: PASS");
} else {
  console.error("\nTool execution smoke: FAIL");
  process.exit(exitCode);
}

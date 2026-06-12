import { loadRepoEnv } from "./load-env.ts";

loadRepoEnv();

const { sendCursorPrompt, getCursorBridgeStatus } = await import("./cursor-bridge.ts");

console.log("status:", JSON.stringify(getCursorBridgeStatus(), null, 2));

const result = await sendCursorPrompt("smoke-test", "Reply with exactly one word: pong");
console.log(
  JSON.stringify(
    {
      ok: result.ok,
      error: result.error,
      agentId: result.agentId,
      runId: result.runId,
      responsePreview: result.response?.slice(0, 300)
    },
    null,
    2
  )
);

process.exit(result.ok ? 0 : 1);

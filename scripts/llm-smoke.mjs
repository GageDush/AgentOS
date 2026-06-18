/**
 * llm-smoke.mjs — quick smoke for the AgentOS LLM router API.
 * Requires the API running (pnpm stack:background). Ollama-only is fine
 * (FEATURE_LITELLM_PROXY=false) — the chat call uses the local lane.
 *
 * Usage: pnpm llm:smoke
 */
const BASE =
  process.env.AGENTOS_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_AGENTOS_API_URL?.trim() ||
  "http://127.0.0.1:8787";

async function call(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

(async () => {
  console.log(`LLM router smoke → ${BASE}`);

  const routes = await call("GET", "/llm/routes");
  console.log("\n[1] GET /llm/routes →", routes.status);
  console.log(JSON.stringify(routes.data, null, 2));

  const chat = await call("POST", "/llm/chat", {
    prompt: "Reply with the single word: ok",
    alias: "agentos-coder",
    agentId: "smoke"
  });
  console.log("\n[2] POST /llm/chat →", chat.status);
  console.log(
    JSON.stringify(
      {
        ok: chat.data?.ok,
        blocked: chat.data?.blocked,
        provider: chat.data?.provider,
        model: chat.data?.model,
        lane: chat.data?.lane,
        attempts: chat.data?.attempts?.length,
        text: typeof chat.data?.text === "string" ? chat.data.text.slice(0, 80) : undefined
      },
      null,
      2
    )
  );

  const activity = await call("GET", "/llm/activity?limit=5");
  console.log("\n[3] GET /llm/activity →", activity.status, "count:", activity.data?.count);

  const passed = routes.status === 200 && chat.status === 200 && activity.status === 200;
  console.log(`\nSmoke ${passed ? "PASSED" : "FAILED"} (router endpoints reachable).`);
  process.exitCode = passed ? 0 : 1;
})().catch((error) => {
  console.error("Smoke error:", error?.message ?? error);
  console.error("Is the API running? Try: pnpm stack:background");
  process.exitCode = 1;
});

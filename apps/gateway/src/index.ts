import { spawn } from "node:child_process";
import Fastify from "fastify";
import { assessCommandPolicy } from "@agentos/sandbox";
import type { GatewayExecutionRequest, GatewayExecutionResult, ToolRequest } from "@agentos/shared";
import { invokeGatewayTool } from "./tools.js";
import { resolveGatewayRepoRoot } from "./repo-root.js";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_GATEWAY_PORT ?? 8790);
const repoRoot = resolveGatewayRepoRoot();
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const commandAliases: Record<string, { file: string; args: string[] }> = {
  "git status": { file: "git", args: ["status"] },
  "git status --short": { file: "git", args: ["status", "--short"] },
  "git diff": { file: "git", args: ["diff"] },
  "git diff --stat": { file: "git", args: ["diff", "--stat"] },
  "git diff --name-only": { file: "git", args: ["diff", "--name-only"] },
  "semgrep --config .semgrep.yml --error --quiet": {
    file: "semgrep",
    args: ["--config", ".semgrep.yml", "--error", "--quiet"]
  },
  "pnpm test": { file: pnpmBin, args: ["test"] },
  "pnpm typecheck": { file: pnpmBin, args: ["typecheck"] },
  "pnpm lint": { file: pnpmBin, args: ["lint"] }
};

function executeAllowedCommand(command: string) {
  const normalized = command.trim().replace(/\s+/g, " ");
  const alias = commandAliases[normalized];
  if (!alias) {
    throw new Error(`Unsupported command alias: ${normalized}`);
  }

  const childCommand =
    process.platform === "win32" && alias.file.endsWith(".cmd")
      ? { file: "cmd.exe", args: ["/d", "/s", "/c", alias.file, ...alias.args] }
      : alias;

  return new Promise<GatewayExecutionResult>((resolve) => {
    const startedAt = Date.now();
    const child = spawn(childCommand.file, childCommand.args, {
      cwd: repoRoot,
      shell: false,
      windowsHide: true,
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        command: normalized,
        exitCode: 1,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}${error.message}`,
        durationMs: Date.now() - startedAt
      });
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        command: normalized,
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - startedAt
      });
    });
  });
}

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS Gateway",
  mode: "local-safe",
  timestamp: new Date().toISOString()
}));

app.post("/policy/check", async (request) => {
  const body = request.body as { command?: string };
  return assessCommandPolicy(body.command ?? "");
});

app.post("/execute", async (request, reply) => {
  const body = request.body as GatewayExecutionRequest;
  const decision = assessCommandPolicy(body.command);

  if (decision.policy !== "auto_allowed") {
    return reply.code(decision.policy === "denied" ? 403 : 409).send({
      ok: false,
      command: body.command,
      decision
    });
  }

  const result = await executeAllowedCommand(body.command);
  return {
    ok: result.ok,
    command: body.command,
    decision,
    result
  };
});

app.post("/tools/invoke", async (request, reply) => {
  const body = request.body as ToolRequest;
  if (!body?.id) {
    return reply.code(400).send({ ok: false, error: "ToolRequest.id is required" });
  }
  if (body.id === "shell" && body.command) {
    const decision = assessCommandPolicy(body.command);
    if (decision.policy !== "auto_allowed") {
      return reply.code(decision.policy === "denied" ? 403 : 409).send({
        ok: false,
        id: body.id,
        error: decision.reason,
        decision
      });
    }
  }
  const result = await invokeGatewayTool(repoRoot, body, async (command) => {
    const exec = await executeAllowedCommand(command);
    return {
      ok: exec.ok,
      stdout: exec.stdout,
      stderr: exec.stderr,
      exitCode: exec.exitCode
    };
  });
  return result;
});

await app.listen({ port, host: "0.0.0.0" });

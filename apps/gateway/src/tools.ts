import { readFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { glob } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { ToolRequest, ToolResult } from "@agentos/shared";
import { isTaskSpawnEnabled } from "@agentos/shared";

export function resolveRepoPath(repoRoot: string, inputPath: string) {
  const root = resolve(repoRoot);
  const target = resolve(root, inputPath.replace(/^[/\\]+/, ""));
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error("Path escapes repository root");
  }
  return target;
}

async function toolRead(repoRoot: string, request: ToolRequest): Promise<ToolResult> {
  const started = Date.now();
  if (!request.path) {
    return { id: "read", ok: false, error: "path is required", durationMs: Date.now() - started };
  }
  try {
    const filePath = resolveRepoPath(repoRoot, request.path);
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      return { id: "read", ok: false, error: "not a file", durationMs: Date.now() - started };
    }
    const stdout = readFileSync(filePath, "utf8");
    return { id: "read", ok: true, stdout, durationMs: Date.now() - started, leaseId: request.leaseId };
  } catch (error) {
    return {
      id: "read",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
      leaseId: request.leaseId
    };
  }
}

async function toolGrep(repoRoot: string, request: ToolRequest): Promise<ToolResult> {
  const started = Date.now();
  if (!request.pattern) {
    return { id: "grep", ok: false, error: "pattern is required", durationMs: Date.now() - started };
  }
  const searchPath = request.path ? resolveRepoPath(repoRoot, request.path) : repoRoot;
  return new Promise((resolveResult) => {
    const args = ["--no-heading", "--line-number", request.pattern!, searchPath];
    const child = spawn("rg", args, { cwd: repoRoot, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", () => {
      resolveResult({
        id: "grep",
        ok: false,
        error: "ripgrep (rg) not available on PATH",
        stderr,
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      });
    });
    child.on("close", (code) => {
      resolveResult({
        id: "grep",
        ok: code === 0 || code === 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      });
    });
  });
}

async function toolGlob(repoRoot: string, request: ToolRequest): Promise<ToolResult> {
  const started = Date.now();
  const pattern = request.glob ?? request.path;
  if (!pattern) {
    return { id: "glob.list", ok: false, error: "glob or path is required", durationMs: Date.now() - started };
  }
  try {
    const matches: string[] = [];
    for await (const entry of glob(pattern, { cwd: repoRoot })) {
      matches.push(entry);
      if (matches.length >= 500) break;
    }
    const paths = matches.map((p: string) => p.replace(/\\/g, "/"));
    return {
      id: "glob.list",
      ok: true,
      paths,
      stdout: paths.join("\n"),
      durationMs: Date.now() - started,
      leaseId: request.leaseId
    };
  } catch (error) {
    return {
      id: "glob.list",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
      leaseId: request.leaseId
    };
  }
}

export async function invokeGatewayTool(
  repoRoot: string,
  request: ToolRequest,
  executeShell: (command: string) => Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }>
): Promise<ToolResult> {
  switch (request.id) {
    case "read":
      return toolRead(repoRoot, request);
    case "grep":
      return toolGrep(repoRoot, request);
    case "glob.list":
      return toolGlob(repoRoot, request);
    case "shell": {
      const started = Date.now();
      if (!request.command) {
        return { id: "shell", ok: false, error: "command is required", durationMs: Date.now() - started };
      }
      const result = await executeShell(request.command);
      return {
        id: "shell",
        ok: result.ok,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      };
    }
    case "git.status": {
      const started = Date.now();
      const result = await executeShell("git status --short");
      return {
        id: "git.status",
        ok: result.ok,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      };
    }
    case "git.diff": {
      const started = Date.now();
      const command = request.path ? `git diff -- ${request.path.replace(/\\/g, "/")}` : "git diff";
      const result = await executeShell(command);
      return {
        id: "git.diff",
        ok: result.ok,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      };
    }
    case "task.spawn": {
      const started = Date.now();
      if (!isTaskSpawnEnabled()) {
        return {
          id: "task.spawn",
          ok: false,
          error: "task.spawn is disabled (set FEATURE_TASK_SPAWN=true)",
          durationMs: Date.now() - started,
          leaseId: request.leaseId
        };
      }
      return {
        id: "task.spawn",
        ok: true,
        stdout: JSON.stringify({
          accepted: true,
          command: request.command ?? "pnpm test",
          note: "Spawn queued to worker lane (mock acknowledgement)."
        }),
        durationMs: Date.now() - started,
        leaseId: request.leaseId
      };
    }
    default:
      return { id: request.id, ok: false, error: `Unsupported tool: ${request.id}` };
  }
}

#!/usr/bin/env node
/**
 * OpenAI tool-loop driver for functionalization tasks (fast gpt-4o-mini path).
 * Uses OPENAI_API_KEY from env — no Cursor SDK required.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";

const ALLOWED_CMD_PREFIXES = ["pnpm ", "node ", "npx ", "pnpm\t"];

function isAllowedCommand(cmd) {
  const trimmed = cmd.trim();
  return ALLOWED_CMD_PREFIXES.some((p) => trimmed.startsWith(p.trim()));
}

function safePath(repoRoot, inputPath) {
  const abs = normalize(resolve(repoRoot, inputPath));
  const root = normalize(resolve(repoRoot));
  if (abs !== root && !abs.startsWith(root + sep)) {
    throw new Error(`Path escapes repo: ${inputPath}`);
  }
  return abs;
}

const tools = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file relative to repo root.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write UTF-8 text to a file relative to repo root. Creates parent dirs.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a whitelisted shell command (pnpm/node/npx only) in repo root.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"]
      }
    }
  }
];

function runTool(repoRoot, name, args) {
  if (name === "read_file") {
    const path = safePath(repoRoot, args.path);
    if (!existsSync(path)) return { error: `File not found: ${args.path}` };
    const content = readFileSync(path, "utf8");
    return { path: args.path, content: content.slice(0, 12000) };
  }
  if (name === "write_file") {
    const path = safePath(repoRoot, args.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, args.content, "utf8");
    return { ok: true, path: args.path, bytes: Buffer.byteLength(args.content, "utf8") };
  }
  if (name === "run_command") {
    if (!isAllowedCommand(args.command)) {
      return { error: `Command not allowed: ${args.command}` };
    }
    const result = spawnSync(args.command, { cwd: repoRoot, shell: true, encoding: "utf8", timeout: 600_000 });
    return {
      command: args.command,
      exitCode: result.status ?? 1,
      stdout: (result.stdout ?? "").slice(-8000),
      stderr: (result.stderr ?? "").slice(-4000)
    };
  }
  return { error: `Unknown tool: ${name}` };
}

async function chat(apiKey, model, messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, tools, tool_choice: "auto", temperature: 0.2 })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? `OpenAI HTTP ${response.status}`);
  }
  return body.choices[0].message;
}

export async function runOpenAiTask({ prompt, repoRoot, apiKey, model = "gpt-4o-mini", maxTurns = 30 }) {
  const messages = [
    {
      role: "system",
      content:
        "You implement AgentOS functionalization tasks. Minimal diffs only. Match existing code style. Use tools to read/write files and run pnpm/node commands. When done, reply with a short summary: files changed, commands run, blockers."
    },
    { role: "user", content: prompt }
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const message = await chat(apiKey, model, messages);
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (!toolCalls.length) {
      return { status: "finished", summary: message.content ?? "", turns: turn + 1 };
    }

    for (const call of toolCalls) {
      const fn = call.function;
      let args = {};
      try {
        args = JSON.parse(fn.arguments || "{}");
      } catch {
        args = {};
      }
      const output = runTool(repoRoot, fn.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output)
      });
      console.log(`[openai tool] ${fn.name} ${fn.name === "run_command" ? args.command : args.path ?? ""}`);
    }
  }

  return { status: "max_turns", summary: "Stopped at max tool turns.", turns: maxTurns };
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import { Agent, CursorAgentError } from "@cursor/sdk";

export type CursorBridgeStatus = {
  enabled: boolean;
  configured: boolean;
  repoCwd: string;
  model: string;
  reason?: string;
};

export type CursorPromptResult = {
  ok: boolean;
  response: string;
  agentId?: string;
  runId?: string;
  error?: string;
  retryable?: boolean;
};

type CursorSessionRecord = {
  agentId: string;
  updatedAt: string;
};

type CursorSessionState = {
  sessions: Record<string, CursorSessionRecord>;
};

const inFlight = new Set<string>();

function sessionStatePath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-cursor-sessions.json");
}

function loadSessionState(): CursorSessionState {
  const path = sessionStatePath();
  if (!existsSync(path)) return { sessions: {} };
  return JSON.parse(readFileSync(path, "utf8")) as CursorSessionState;
}

function saveSessionState(state: CursorSessionState) {
  const path = sessionStatePath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export function getCursorRepoCwd() {
  const configured = process.env.AGENTOS_CURSOR_REPO_CWD?.trim();
  if (configured) return configured;
  return findRepoRoot(process.cwd());
}

export function getCursorModelId() {
  return process.env.AGENTOS_CURSOR_MODEL?.trim() || "composer-2.5";
}

export function isCursorBridgeConfigured() {
  return Boolean(process.env.CURSOR_API_KEY?.trim());
}

export function isCursorBridgeEnabled() {
  if ((process.env.FEATURE_DISCORD_CURSOR ?? "true") === "false") return false;
  return isCursorBridgeConfigured();
}

export function getCursorBridgeStatus(): CursorBridgeStatus {
  const configured = isCursorBridgeConfigured();
  const enabled = isCursorBridgeEnabled();
  return {
    enabled,
    configured,
    repoCwd: getCursorRepoCwd(),
    model: getCursorModelId(),
    reason: !configured
      ? "Set CURSOR_API_KEY in .env (Cursor Dashboard → Integrations)."
      : !enabled
        ? "FEATURE_DISCORD_CURSOR=false"
        : undefined
  };
}

export function getCursorSessionAgentId(discordUserId: string) {
  return loadSessionState().sessions[discordUserId]?.agentId;
}

export function resetCursorSession(discordUserId: string) {
  const state = loadSessionState();
  delete state.sessions[discordUserId];
  saveSessionState(state);
}

function rememberCursorSession(discordUserId: string, agentId: string) {
  const state = loadSessionState();
  state.sessions[discordUserId] = { agentId, updatedAt: new Date().toISOString() };
  saveSessionState(state);
}

function extractAssistantText(event: {
  type?: string;
  message?: { content?: Array<{ type?: string; text?: string }> };
}) {
  if (event.type !== "assistant" || !event.message?.content) return "";
  return event.message.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("");
}

/** Mission/run-scoped Cursor session for implementer dispatch (Phase 3). */
export async function sendMissionCursorPrompt(sessionKey: string, prompt: string): Promise<CursorPromptResult> {
  return sendCursorPrompt(`mission:${sessionKey}`, prompt);
}

export async function sendCursorPrompt(discordUserId: string, prompt: string): Promise<CursorPromptResult> {
  const status = getCursorBridgeStatus();
  if (!status.enabled) {
    return {
      ok: false,
      response: "",
      error: status.reason ?? "Cursor bridge is not configured."
    };
  }

  if (inFlight.has(discordUserId)) {
    return {
      ok: false,
      response: "",
      error: "Cursor is already working on your previous message. Wait for the reply or send `reset` after it finishes."
    };
  }

  const apiKey = process.env.CURSOR_API_KEY!.trim();
  const cwd = getCursorRepoCwd();
  const model = getCursorModelId();
  const modelSelection = { id: model };
  let existingAgentId: string | undefined = getCursorSessionAgentId(discordUserId);

  function shouldResetSession(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return (
      message.includes("explicit model") ||
      message.includes("not found") ||
      message.includes("invalid agent")
    );
  }

  inFlight.add(discordUserId);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await using agent = existingAgentId
          ? await Agent.resume(existingAgentId, {
              apiKey,
              model: modelSelection,
              local: { cwd }
            })
          : await Agent.create({
              apiKey,
              model: modelSelection,
              local: { cwd, settingSources: [] }
            });

        const run = await agent.send(prompt.trim(), { model: modelSelection });
        let streamed = "";
        for await (const event of run.stream()) {
          streamed += extractAssistantText(event as Parameters<typeof extractAssistantText>[0]);
        }

        const result = await run.wait();
        const agentId = agent.agentId;
        if (agentId) rememberCursorSession(discordUserId, agentId);

        if (result.status === "error") {
          return {
            ok: false,
            response: streamed.trim(),
            agentId,
            runId: result.id,
            error: "Cursor run failed. Check the repo state or send `reset` to start a fresh session."
          };
        }

        const finalText =
          (typeof result.result === "string" && result.result.trim()) ||
          streamed.trim() ||
          "Cursor completed without text output.";

        return {
          ok: true,
          response: finalText.slice(0, 3900),
          agentId,
          runId: result.id
        };
      } catch (error) {
        if (attempt === 0 && existingAgentId && shouldResetSession(error)) {
          resetCursorSession(discordUserId);
          existingAgentId = undefined;
          continue;
        }
        throw error;
      }
    }

    return {
      ok: false,
      response: "",
      error: "Cursor bridge failed to start a session."
    };
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return {
        ok: false,
        response: "",
        error: error.message,
        retryable: error.isRetryable
      };
    }
    return {
      ok: false,
      response: "",
      error: error instanceof Error ? error.message : "Cursor bridge failed."
    };
  } finally {
    inFlight.delete(discordUserId);
  }
}

import { buildDefaultRuntimeOptions } from "@agentos/runtime";
import type { RuntimeOptions } from "@agentos/runtime";
import { sendMissionCursorPrompt } from "./cursor-bridge";
import { isCursorBridgeEnabled } from "./cursor-bridge";

export function buildApiRuntimeOptions(input?: { sessionKey?: string; workerId?: string }): RuntimeOptions {
  const base = buildDefaultRuntimeOptions({
    sessionKey: input?.sessionKey,
    workerId: input?.workerId
  });
  const sessionKey = input?.sessionKey;
  const useCursor = isCursorBridgeEnabled() && (process.env.AGENTOS_IMPLEMENTER_MODE ?? "gateway") === "cursor";

  if (useCursor) {
    return {
      ...base,
      implementerDispatch: {
        mode: "cursor",
        sessionKey,
        cursorPrompt: async ({ prompt, sessionKey: key }) => {
          const result = await sendMissionCursorPrompt(key, prompt);
          return { ok: result.ok, summary: result.response || result.error || "Cursor completed." };
        }
      }
    };
  }

  return base;
}

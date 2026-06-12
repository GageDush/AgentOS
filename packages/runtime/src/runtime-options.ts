import type { ImplementerDispatchOptions } from "@agentos/agents";
import { resolveImplementerDispatchMode } from "@agentos/agents";
import type { PersistenceAdapter } from "@agentos/persistence";

/**
 * Shared runtime options for worker + API (gateway/mock implementer).
 * API layer may overlay cursor dispatch via buildApiRuntimeOptions.
 */
export function buildDefaultRuntimeOptions(input?: {
  sessionKey?: string;
  workerId?: string;
  persistence?: PersistenceAdapter;
  gatewayBase?: string;
}) {
  const mode = resolveImplementerDispatchMode();
  const implementerDispatch: ImplementerDispatchOptions = {
    mode: mode === "cursor" ? "gateway" : mode,
    sessionKey: input?.sessionKey
  };

  return {
    persistence: input?.persistence,
    gatewayBase: input?.gatewayBase,
    workerId: input?.workerId,
    implementerDispatch
  };
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAgentOSEvents, type AgentOSConnectionMode } from "./use-agentos-events";

type AgentOSEventsContextValue = {
  mode: AgentOSConnectionMode;
  lastSnapshot: unknown;
  lastEventAt: string | null;
};

const AgentOSEventsContext = createContext<AgentOSEventsContextValue | null>(null);

export function AgentOSEventsProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const events = useAgentOSEvents({ pollFallbackMs: 5000, enabled });
  return <AgentOSEventsContext.Provider value={events}>{children}</AgentOSEventsContext.Provider>;
}

export function useAgentOSEventsContext() {
  const ctx = useContext(AgentOSEventsContext);
  if (!ctx) {
    throw new Error("useAgentOSEventsContext must be used within AgentOSEventsProvider");
  }
  return ctx;
}

export function useAgentOSEventsContextOptional() {
  return useContext(AgentOSEventsContext);
}

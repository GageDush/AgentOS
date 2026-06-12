export type AgentsExecutedEvent = {
  missionId: string;
  runId: string;
  executedAgentIds: string[];
  synthesizerSummary?: string;
  operatorId?: string;
};

export type MissionBriefingReadyEvent = AgentsExecutedEvent & {
  resultSummary?: string;
};

type AgentsExecutedListener = (event: AgentsExecutedEvent) => void | Promise<void>;
type MissionBriefingReadyListener = (event: MissionBriefingReadyEvent) => void | Promise<void>;

const agentsExecutedListeners = new Set<AgentsExecutedListener>();
const missionBriefingReadyListeners = new Set<MissionBriefingReadyListener>();

export function onAgentsExecuted(listener: AgentsExecutedListener) {
  agentsExecutedListeners.add(listener);
  return () => agentsExecutedListeners.delete(listener);
}

export function onMissionBriefingReady(listener: MissionBriefingReadyListener) {
  missionBriefingReadyListeners.add(listener);
  return () => missionBriefingReadyListeners.delete(listener);
}

export async function emitAgentsExecuted(event: AgentsExecutedEvent) {
  for (const listener of agentsExecutedListeners) {
    await listener(event);
  }
}

export async function emitMissionBriefingReady(event: MissionBriefingReadyEvent) {
  for (const listener of missionBriefingReadyListeners) {
    await listener(event);
  }
}

export function resetAgentsExecutedListenersForTests() {
  agentsExecutedListeners.clear();
  missionBriefingReadyListeners.clear();
}

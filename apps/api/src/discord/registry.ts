import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import type { AgentRichMessageScope } from "@agentos/shared";

export type DiscordCardChannel = "general" | "operator" | "cursor" | "approvals";

export type DiscordMessageRecord = {
  channelId: string;
  kind: "approval" | "task" | "status" | "audit" | "generic" | "rich-card";
  entityId?: string;
  embedSnapshot?: Record<string, unknown>;
  componentsSnapshot?: Array<{ type: 1; components: Array<Record<string, unknown>> }>;
  richScope?: AgentRichMessageScope;
  cardChannel?: DiscordCardChannel;
  reactionCommands?: Record<string, string>;
  seenAt?: string;
  seenBy?: string;
  createdAt: string;
};

export type DiscordRegistryState = {
  messages: Record<string, DiscordMessageRecord>;
  notifiedApprovals: string[];
  notifiedOutbox: string[];
  updatedAt: string;
};

function registryPath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-registry.json");
}

function emptyState(): DiscordRegistryState {
  return { messages: {}, notifiedApprovals: [], notifiedOutbox: [], updatedAt: new Date().toISOString() };
}

export function loadDiscordRegistry(): DiscordRegistryState {
  const path = registryPath();
  if (!existsSync(path)) return emptyState();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<DiscordRegistryState>;
    return {
      messages: parsed.messages ?? {},
      notifiedApprovals: parsed.notifiedApprovals ?? [],
      notifiedOutbox: parsed.notifiedOutbox ?? [],
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    return emptyState();
  }
}

export function saveDiscordRegistry(state: DiscordRegistryState) {
  const path = registryPath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

export function registerDiscordMessage(
  messageId: string,
  record: Omit<DiscordMessageRecord, "createdAt"> & { createdAt?: string }
) {
  const state = loadDiscordRegistry();
  state.messages[messageId] = {
    ...record,
    createdAt: record.createdAt ?? new Date().toISOString()
  };
  saveDiscordRegistry(state);
  return state.messages[messageId];
}

export function markDiscordMessageSeen(messageId: string, seenBy: string) {
  const state = loadDiscordRegistry();
  const record = state.messages[messageId];
  if (!record) return undefined;
  record.seenAt = new Date().toISOString();
  record.seenBy = seenBy;
  saveDiscordRegistry(state);
  return record;
}

export function hasNotifiedApproval(approvalId: string) {
  return loadDiscordRegistry().notifiedApprovals.includes(approvalId);
}

export function markApprovalNotified(approvalId: string) {
  const state = loadDiscordRegistry();
  if (!state.notifiedApprovals.includes(approvalId)) {
    state.notifiedApprovals.push(approvalId);
    saveDiscordRegistry(state);
  }
}

export function hasNotifiedOutbox(kind: "audit" | "usage", id: string) {
  return loadDiscordRegistry().notifiedOutbox.includes(`${kind}:${id}`);
}

export function markNotifiedOutbox(kind: "audit" | "usage", id: string) {
  const state = loadDiscordRegistry();
  const key = `${kind}:${id}`;
  if (!state.notifiedOutbox.includes(key)) {
    state.notifiedOutbox.push(key);
    saveDiscordRegistry(state);
  }
}

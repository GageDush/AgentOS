export type ToolId =
  | "read"
  | "grep"
  | "glob.list"
  | "shell"
  | "git.status"
  | "git.diff"
  | "task.spawn"
  | "memory.search"
  | "patch.apply";

export function isTaskSpawnEnabled() {
  const raw = process.env.FEATURE_TASK_SPAWN?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export type ToolRequest = {
  id: ToolId;
  /** Repo-relative path for read/grep/glob */
  path?: string;
  /** Grep pattern */
  pattern?: string;
  /** Glob pattern (repo-relative) */
  glob?: string;
  /** Allowlisted shell command (gateway alias) */
  command?: string;
  missionId?: string;
  runId?: string;
  leaseId?: string;
};

export type ToolResult = {
  id: ToolId;
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  paths?: string[];
  error?: string;
  durationMs?: number;
  leaseId?: string;
};

export function serializeToolRequest(request: ToolRequest): string {
  return JSON.stringify(request);
}

export function parseToolRequest(raw: string): ToolRequest {
  const parsed = JSON.parse(raw) as ToolRequest;
  if (!parsed?.id) throw new Error("ToolRequest.id is required");
  return parsed;
}

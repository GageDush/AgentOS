import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QuotaBucketStatus, QuotaProviderId, QuotaStewardStatus, UsageEvent } from "@agentos/shared";
import { nowIso } from "@agentos/shared";

type QuotaBucketConfig = {
  id: string;
  label: string;
  windowHours?: number;
  windowDays?: number;
  maxUnits: number;
  unitLabel: string;
};

type QuotaProviderConfig = {
  displayName: string;
  sourceUrl: string;
  billingReset?: string;
  buckets: QuotaBucketConfig[];
};

type QuotaProvidersFile = {
  warningThresholdPercent: number;
  providers: Record<QuotaProviderId, QuotaProviderConfig>;
};

export type QuotaEvaluation = {
  allowed: boolean;
  warning: boolean;
  blocked: boolean;
  reason?: string;
  status: QuotaStewardStatus;
};

export type StopFileRecord = {
  agentId: string;
  provider: QuotaProviderId;
  bucketId: string;
  reason: string;
  blockedAt: string;
  missionId?: string;
  runId?: string;
  resumeHint: string;
};

export type ResumeQueueItem = {
  id: string;
  missionId: string;
  runId?: string;
  agentId: string;
  provider: QuotaProviderId;
  status: "pending_steward_review" | "awaiting_admin_approval" | "approved" | "denied";
  summary: string;
  createdAt: string;
};

function resolveRepoRoot(startDir: string) {
  let current = startDir;
  for (;;) {
    const configPath = join(current, "configs", "quota-providers.json");
    if (existsSync(configPath)) return current;
    const parent = dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function loadQuotaConfig(repoRoot: string): QuotaProvidersFile {
  const root = resolveRepoRoot(repoRoot);
  const path = join(root, "configs", "quota-providers.json");
  return JSON.parse(readFileSync(path, "utf8")) as QuotaProvidersFile;
}

function agentStopsRoot(repoRoot: string, agentId: string) {
  return join(repoRoot, ".agentos", "stops", agentId);
}

function stopFilePath(repoRoot: string, agentId: string) {
  return join(agentStopsRoot(repoRoot, agentId), "stop.json");
}

function queueFilePath(repoRoot: string, agentId: string) {
  return join(agentStopsRoot(repoRoot, agentId), "queue.json");
}

function windowStartMs(bucket: QuotaBucketConfig, cursorBillingDay?: number) {
  const now = Date.now();
  if (bucket.windowHours) {
    return now - bucket.windowHours * 60 * 60 * 1000;
  }
  if (bucket.id === "monthly_included" && cursorBillingDay) {
    const date = new Date();
    const day = Math.min(Math.max(cursorBillingDay, 1), 28);
    const reset = new Date(date.getFullYear(), date.getMonth(), day);
    if (reset.getTime() > now) {
      reset.setMonth(reset.getMonth() - 1);
    }
    return reset.getTime();
  }
  const days = bucket.windowDays ?? 7;
  return now - days * 24 * 60 * 60 * 1000;
}

function eventWeight(event: UsageEvent) {
  const meta = event as UsageEvent & { metadata?: { quotaWeight?: number; spendingPercent?: number } };
  if (typeof meta.metadata?.spendingPercent === "number") return meta.metadata.spendingPercent;
  if (typeof meta.metadata?.quotaWeight === "number") return meta.metadata.quotaWeight;
  if (event.provider === "cursor") {
    return Math.min(100, Math.max(0, event.estimatedCostUsd * 5));
  }
  return 1;
}

function sumBucketUtilization(events: UsageEvent[], providerId: QuotaProviderId, bucket: QuotaBucketConfig, cursorBillingDay?: number) {
  const start = windowStartMs(bucket, cursorBillingDay);
  const relevant = events.filter((event) => {
    if (event.provider !== providerId) return false;
    return new Date(event.createdAt).getTime() >= start;
  });
  const used = relevant.reduce((sum, event) => sum + eventWeight(event), 0);
  return Math.min(100, Number(((used / bucket.maxUnits) * 100).toFixed(1)));
}

export function evaluateQuotaSteward(
  events: UsageEvent[],
  repoRoot: string,
  options?: { cursorBillingDay?: number }
): QuotaEvaluation {
  const config = loadQuotaConfig(repoRoot);
  const warnAt = config.warningThresholdPercent;
  const cursorBillingDay = options?.cursorBillingDay ?? Number(process.env.AGENTOS_CURSOR_BILLING_DAY ?? 1);
  const providers: QuotaBucketStatus[] = [];
  const stoppedAgents: string[] = [];
  let blocked = false;
  let warning = false;

  for (const providerId of Object.keys(config.providers) as QuotaProviderId[]) {
    const provider = config.providers[providerId];
    for (const bucket of provider.buckets) {
      const utilizationPercent = sumBucketUtilization(events, providerId, bucket, cursorBillingDay);
      const bucketWarning = utilizationPercent >= warnAt;
      const bucketBlocked = utilizationPercent >= 100;
      if (bucketWarning) warning = true;
      if (bucketBlocked) blocked = true;
      providers.push({
        providerId,
        bucketId: bucket.id,
        label: `${provider.displayName} · ${bucket.label}`,
        utilizationPercent,
        warning: bucketWarning,
        blocked: bucketBlocked
      });
    }
  }

  for (const agentId of listStoppedAgentIds(repoRoot)) {
    stoppedAgents.push(agentId);
  }

  const resumeQueueCount = stoppedAgents.reduce((count, agentId) => count + readResumeQueue(repoRoot, agentId).length, 0);

  return {
    allowed: !blocked,
    warning,
    blocked,
    reason: blocked ? "A subscription provider bucket is fully depleted." : warning ? "A subscription provider bucket is above the warning threshold." : undefined,
    status: { providers, resumeQueueCount, stoppedAgents }
  };
}

export function writeAgentStopFile(repoRoot: string, record: StopFileRecord) {
  const dir = agentStopsRoot(repoRoot, record.agentId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(stopFilePath(repoRoot, record.agentId), JSON.stringify(record, null, 2), "utf8");
}

export function readAgentStopFile(repoRoot: string, agentId: string): StopFileRecord | undefined {
  const path = stopFilePath(repoRoot, agentId);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as StopFileRecord;
}

export function clearAgentStopFile(repoRoot: string, agentId: string) {
  const path = stopFilePath(repoRoot, agentId);
  if (existsSync(path)) writeFileSync(path, "", "utf8");
}

export function readResumeQueue(repoRoot: string, agentId: string): ResumeQueueItem[] {
  const path = queueFilePath(repoRoot, agentId);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { items?: ResumeQueueItem[] };
  return parsed.items ?? [];
}

export function enqueueResumeItem(repoRoot: string, agentId: string, item: ResumeQueueItem) {
  const dir = agentStopsRoot(repoRoot, agentId);
  mkdirSync(dir, { recursive: true });
  const items = readResumeQueue(repoRoot, agentId).filter((entry) => entry.id !== item.id);
  items.push(item);
  writeFileSync(queueFilePath(repoRoot, agentId), JSON.stringify({ items }, null, 2), "utf8");
}

export function listStoppedAgentIds(repoRoot: string) {
  const root = join(repoRoot, ".agentos", "stops");
  if (!existsSync(root)) return [] as string[];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((agentId) => existsSync(stopFilePath(repoRoot, agentId)));
}

export function gatePremiumProviderRun(
  events: UsageEvent[],
  repoRoot: string,
  input: { provider: QuotaProviderId; agentId: string; missionId?: string; runId?: string }
): QuotaEvaluation {
  const evaluation = evaluateQuotaSteward(events, repoRoot);
  const providerBuckets = evaluation.status.providers.filter((bucket) => bucket.providerId === input.provider);
  const depleted = providerBuckets.some((bucket) => bucket.blocked);
  if (!depleted) return evaluation;

  writeAgentStopFile(repoRoot, {
    agentId: input.agentId,
    provider: input.provider,
    bucketId: providerBuckets.find((bucket) => bucket.blocked)?.bucketId ?? "unknown",
    reason: evaluation.reason ?? "Provider bucket depleted.",
    blockedAt: nowIso(),
    missionId: input.missionId,
    runId: input.runId,
    resumeHint: "Wait for bucket reset, then steward review and admin approval."
  });
  enqueueResumeItem(repoRoot, input.agentId, {
    id: `resume-${input.runId ?? input.missionId ?? nowIso()}`,
    missionId: input.missionId ?? "unknown",
    runId: input.runId,
    agentId: input.agentId,
    provider: input.provider,
    status: "pending_steward_review",
    summary: evaluation.reason ?? "Provider bucket depleted.",
    createdAt: nowIso()
  });
  return { ...evaluation, allowed: false, blocked: true };
}

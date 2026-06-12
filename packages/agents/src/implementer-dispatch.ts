import type { AgentReport, ContextPacket, TaskEnvelope } from "@agentos/shared";
import { buildProfileAwareSummary } from "./llm";
import {
  applyUnifiedDiff,
  extractUnifiedDiffFromText,
  parseChangedFilesFromDiff,
  parseChangedFilesFromGitNameOnly,
  type PatchApplyResult
} from "./patch-apply";
import { runFixVerifyLoop } from "./fix-verify";
import { isLlmToolLoopEnabled, runLlmToolLoop } from "./llm-tool-loop";
import { executeTool, isToolExecutionEnabled, probeImplementerContext } from "./tool-broker";

export type ImplementerDispatchMode = "mock" | "gateway" | "cursor";

export type ImplementerCommandResult = {
  ok: boolean;
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
};

export type ImplementerDispatchOptions = {
  mode?: ImplementerDispatchMode;
  executeCommand?: (command: string) => Promise<ImplementerCommandResult>;
  cursorPrompt?: (input: { prompt: string; sessionKey: string }) => Promise<{ ok: boolean; summary: string }>;
  generatePatch?: (prompt: string) => Promise<string>;
  applyPatch?: (diffText: string, allowedPaths: string[]) => Promise<PatchApplyResult>;
  sessionKey?: string;
  missionId?: string;
  runId?: string;
  gatewayUrl?: string;
};

function extractRepoPathsFromText(...texts: string[]) {
  const paths = new Set<string>();
  const patterns = [
    /\b(?:apps|packages|scripts|docs|infra)\/[A-Za-z0-9_./-]+/g,
    /\b[A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs|json|md|sql|css)\b/g
  ];
  for (const text of texts) {
    if (!text) continue;
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        paths.add(match[0].replace(/['"`]/g, ""));
      }
    }
  }
  return [...paths];
}

function shouldApplyImplementerPatches() {
  const raw = process.env.AGENTOS_IMPLEMENTER_APPLY_PATCHES;
  if (raw === undefined || raw === "") return true;
  return !["false", "0", "no", "off"].includes(raw.toLowerCase());
}

async function tryApplyPatchFromText(
  text: string,
  scopedFiles: string[],
  options?: ImplementerDispatchOptions
): Promise<{ applied: boolean; changedFiles: string[]; error?: string }> {
  if (!shouldApplyImplementerPatches()) return { applied: false, changedFiles: [] };
  const diff = extractUnifiedDiffFromText(text);
  if (!diff) return { applied: false, changedFiles: [] };

  const apply = options?.applyPatch ?? ((patch, allowed) => Promise.resolve(applyUnifiedDiff(patch, undefined, allowed)));
  const result = await apply(diff, scopedFiles);
  if (!result.ok) return { applied: false, changedFiles: [], error: result.error };
  const fromDiff = parseChangedFilesFromDiff(diff);
  return { applied: true, changedFiles: result.changedFiles.length ? result.changedFiles : fromDiff };
}

const IMPLEMENTER_PROFILES = new Set([
  "code-implementer",
  "frontend-ui-agent",
  "backend-service-agent",
  "database-migration-agent",
  "docs-agent"
]);

export function isImplementerProfile(profileId: string) {
  return IMPLEMENTER_PROFILES.has(profileId);
}

export function resolveImplementerDispatchMode(): ImplementerDispatchMode {
  const raw = (process.env.AGENTOS_IMPLEMENTER_MODE ?? "gateway").toLowerCase();
  if (raw === "mock" || raw === "cursor" || raw === "gateway") return raw;
  return "gateway";
}

function buildImplementerPrompt(profileId: string, envelope: TaskEnvelope, contextPacket?: ContextPacket) {
  const files = (contextPacket?.repoPaths ?? envelope.filesInScope).slice(0, 10).join(", ") || "infer from goal";
  return [
    `AgentOS ${profileId} implementation task.`,
    `Goal: ${envelope.userGoal}`,
    `Objective: ${envelope.normalizedGoal}`,
    `Task type: ${envelope.taskType} (${envelope.complexity})`,
    `Files in scope: ${files}`,
    `Acceptance: ${envelope.acceptanceCriteria.slice(0, 3).join("; ")}`,
    "Make the smallest correct change. Run relevant checks. Summarize what changed."
  ].join("\n");
}

export async function dispatchImplementerWork(
  profileId: string,
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket,
  options?: ImplementerDispatchOptions
): Promise<AgentReport & { dispatchMode: ImplementerDispatchMode }> {
  const mode = options?.mode ?? resolveImplementerDispatchMode();
  const scopedFiles =
    contextPacket?.repoPaths?.length
      ? contextPacket.repoPaths
      : envelope.filesInScope.length
        ? envelope.filesInScope
        : extractRepoPathsFromText(envelope.normalizedGoal, envelope.userGoal, envelope.inScope[0]);
  const commandsRun: string[] = [];

  if (mode === "cursor" && options?.cursorPrompt && options.sessionKey) {
    const prompt = buildImplementerPrompt(profileId, envelope, contextPacket);
    const result = await options.cursorPrompt({ prompt, sessionKey: options.sessionKey });
    const patchAttempt = result.ok
      ? await tryApplyPatchFromText(result.summary, scopedFiles, options)
      : { applied: false, changedFiles: [] as string[] };
    return {
      agent: profileId,
      status: result.ok ? "complete" : "failed",
      summary: patchAttempt.applied
        ? `${result.summary}\n\nApplied patch to: ${patchAttempt.changedFiles.join(", ")}.`
        : result.summary,
      changedFiles: patchAttempt.changedFiles.length ? patchAttempt.changedFiles : scopedFiles.slice(0, 8),
      commandsRun: ["cursor.agent.send"],
      dispatchMode: "cursor",
      nextActions: result.ok ? ["Run QA gate before completion."] : ["Review Cursor output and retry."]
    };
  }

  if (mode === "gateway" && options?.executeCommand) {
    let changedFiles: string[] = [];
    const prompt = buildImplementerPrompt(profileId, envelope, contextPacket);
    let toolExcerpt = "";

    if (isToolExecutionEnabled() && scopedFiles.length > 0) {
      const recordProbe = (toolsRun: string[], excerpts: string[], budgetLabel?: string) => {
        if (!toolsRun.length) return;
        commandsRun.push(...toolsRun);
        toolExcerpt = excerpts.filter(Boolean).join("\n---\n").slice(0, 800);
        if (budgetLabel) commandsRun.push(budgetLabel);
      };

      if (isLlmToolLoopEnabled() && options.generatePatch) {
        const loop = await runLlmToolLoop(
          async (prior) => {
            const loopPrompt = [
              prompt,
              prior.length ? `Prior tool output:\n${prior.join("\n---\n").slice(0, 1200)}` : "",
              'If you need repo context, respond with a fenced JSON tool call like {"id":"read","path":"src/file.ts"}. Otherwise summarize the plan.'
            ]
              .filter(Boolean)
              .join("\n\n");
            return options.generatePatch!(loopPrompt);
          },
          (request) =>
            executeTool(request, {
              gatewayUrl: options.gatewayUrl,
              missionId: options.missionId,
              runId: options.runId
            }),
          { missionId: options.missionId, runId: options.runId }
        );
        if (loop.toolsRun.length) {
          commandsRun.push(...loop.toolsRun.map((t) => `llm.tool:${t}`));
          toolExcerpt = loop.excerpts.filter(Boolean).join("\n---\n").slice(0, 800);
          if (loop.budget) commandsRun.push(`tool.budget:${loop.budget.iterations}/${loop.budget.maxIterations}`);
        } else {
          const probe = await probeImplementerContext(scopedFiles, {
            gatewayUrl: options.gatewayUrl,
            missionId: options.missionId,
            runId: options.runId
          });
          recordProbe(
            probe.toolsRun,
            probe.excerpts,
            probe.budget ? `tool.budget:${probe.budget.iterations}/${probe.budget.maxIterations}` : undefined
          );
        }
      } else {
        const probe = await probeImplementerContext(scopedFiles, {
          gatewayUrl: options.gatewayUrl,
          missionId: options.missionId,
          runId: options.runId
        });
        recordProbe(
          probe.toolsRun,
          probe.excerpts,
          probe.budget ? `tool.budget:${probe.budget.iterations}/${probe.budget.maxIterations}` : undefined
        );
      }
    }

    if (shouldApplyImplementerPatches() && options.generatePatch && scopedFiles.length > 0) {
      const patchPrompt = [
        prompt,
        "Return ONLY a unified diff (```diff fenced) for the smallest correct change in scoped files.",
        `Scoped files: ${scopedFiles.slice(0, 8).join(", ")}`
      ].join("\n\n");
      const patchText = await options.generatePatch(patchPrompt);
      const patchAttempt = await tryApplyPatchFromText(patchText, scopedFiles, options);
      if (patchAttempt.applied) {
        changedFiles = patchAttempt.changedFiles;
        commandsRun.push("implementer.patch.apply");
      }
    }

    const candidates = [
      ...(contextPacket?.suggestedCommands ?? []),
      envelope.inScope[0],
      changedFiles.length ? "git diff --name-only" : undefined
    ].filter(Boolean) as string[];
    const unique = [...new Set(candidates)].slice(0, 4);
    const outputs: string[] = [];

    for (const command of unique) {
      const result = await options.executeCommand(command);
      commandsRun.push(command);
      if (command === "git diff --name-only" && result.ok && result.stdout) {
        changedFiles = parseChangedFilesFromGitNameOnly(result.stdout);
      }
      if (result.stdout) outputs.push(result.stdout.slice(0, 400));
      if (!result.ok) {
        return {
          agent: profileId,
          status: "blocked",
          summary: `Gateway implementer dispatch failed on \`${command}\`.`,
          changedFiles: changedFiles.length ? changedFiles : scopedFiles.slice(0, 8),
          commandsRun,
          dispatchMode: "gateway",
          nextActions: ["Fix failing command or adjust mission scope."]
        };
      }
    }

    if (isToolExecutionEnabled() && changedFiles.length > 0) {
      const fixVerify = await runFixVerifyLoop(async (cmd) => {
        const result = await options.executeCommand!(cmd);
        return {
          ok: result.ok,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        };
      });
      commandsRun.push(`fix-verify:${fixVerify.attempts.length}`);
      if (fixVerify.needsAttention) {
        return {
          agent: profileId,
          status: "blocked",
          summary: "Fix-verify retries exhausted after implementer changes.",
          changedFiles,
          commandsRun,
          dispatchMode: "gateway",
          nextActions: ["Review test failures and retry mission."]
        };
      }
    }

    const baseSummary = changedFiles.length
      ? `Gateway implementer applied changes to ${changedFiles.length} file(s) and verified commands.`
      : `Gateway implementer verified ${unique.length} scoped command(s) for ${envelope.taskType}.`;
    const summary = await buildProfileAwareSummary(
      profileId,
      envelope,
      contextPacket,
      toolExcerpt ? `${baseSummary}\n\nTool context:\n${toolExcerpt}` : baseSummary
    );
    return {
      agent: profileId,
      status: "complete",
      summary: outputs.length ? `${summary} ${outputs[0]}` : summary,
      changedFiles: changedFiles.length ? changedFiles : scopedFiles.slice(0, 8),
      commandsRun,
      dispatchMode: "gateway",
      nextActions: envelope.requiresQa ? ["Run QA gate before completion."] : []
    };
  }

  const summary = await buildProfileAwareSummary(
    profileId,
    envelope,
    contextPacket,
    `Mock implementer prepared plan for ${envelope.taskType}.`
  );
  return {
    agent: profileId,
    status: "complete",
    summary,
    changedFiles: envelope.requiresCodeChange ? scopedFiles.slice(0, 5) : [],
    commandsRun: contextPacket?.suggestedCommands.slice(0, 2) ?? [],
    dispatchMode: "mock",
    nextActions: ["Enable AGENTOS_IMPLEMENTER_MODE=gateway or cursor for real dispatch."]
  };
}

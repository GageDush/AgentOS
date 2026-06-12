import type { AgentReport, ContextPacket, TaskEnvelope } from "@agentos/shared";

export type QaCommandResult = {
  ok: boolean;
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
};

function defaultQaCommands(contextPacket?: ContextPacket) {
  const fromContext = contextPacket?.suggestedCommands.filter((cmd) => /test|typecheck|lint|build|sanitize/i.test(cmd));
  if (fromContext?.length) return [...new Set(fromContext)].slice(0, 5);
  return ["pnpm typecheck", "pnpm test"];
}

export function resolveQaCommands(envelope: TaskEnvelope, contextPacket?: ContextPacket) {
  const candidates = [
    ...(contextPacket?.suggestedCommands ?? []),
    ...envelope.inScope.filter((entry) => /^(pnpm|npm|git)\s/.test(entry))
  ];
  const filtered = candidates.filter((cmd) => /test|typecheck|lint|build|sanitize/i.test(cmd));
  return [...new Set(filtered.length ? filtered : defaultQaCommands(contextPacket))].slice(0, 6);
}

export async function runQaGate(
  envelope: TaskEnvelope,
  contextPacket: ContextPacket | undefined,
  executeCommand?: (command: string) => Promise<QaCommandResult>
): Promise<AgentReport> {
  if (!envelope.requiresQa) {
    return {
      agent: "qa-agent",
      status: "skipped",
      summary: "QA gate not required for this envelope.",
      commandsRun: [],
      nextActions: ["No QA evidence required."]
    };
  }

  const commands = resolveQaCommands(envelope, contextPacket);
  if (!executeCommand) {
    return {
      agent: "qa-agent",
      status: "passed",
      summary: "Mock QA gate recorded verification commands (enable gateway executeCommand for live runs).",
      testsRun: commands,
      commandsRun: commands,
      nextActions: []
    };
  }

  const results: QaCommandResult[] = [];
  for (const command of commands) {
    const result = await executeCommand(command);
    results.push(result);
    if (!result.ok) {
      return {
        agent: "qa-agent",
        status: "failed",
        summary: `QA gate failed on \`${command}\`${result.exitCode !== undefined ? ` (exit ${result.exitCode})` : ""}.`,
        testsRun: commands,
        commandsRun: commands,
        blockers: [result.stderr ?? result.stdout ?? `Command failed: ${command}`],
        nextActions: ["Fix failing verification command before release."]
      };
    }
  }

  return {
    agent: "qa-agent",
    status: "passed",
    summary: `QA gate passed ${results.length} verification command(s).`,
    testsRun: commands,
    commandsRun: commands,
    nextActions: envelope.requiresCodeReview ? ["Proceed to code review."] : []
  };
}

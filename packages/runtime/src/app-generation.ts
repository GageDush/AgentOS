import { scaffoldApp } from "@agentos/app-generator";
import { parseBuildIntent } from "@agentos/orchestrator";
import type { BuildIntent, MissionRecord } from "@agentos/shared";
import type { PersistenceAdapter } from "@agentos/persistence";

export function readBuildIntent(mission: MissionRecord): BuildIntent {
  const metadata = mission.metadata as {
    buildIntent?: BuildIntent;
    questionnaireAnswers?: Record<string, string>;
  } | undefined;
  if (metadata?.buildIntent) {
    return {
      ...metadata.buildIntent,
      answers: metadata.buildIntent.answers ?? metadata.questionnaireAnswers
    };
  }
  return parseBuildIntent(mission.prompt || mission.objective || mission.title);
}

export function runAppGenerationForMission(
  mission: MissionRecord,
  persistence: PersistenceAdapter,
  runId: string
) {
  const intent = readBuildIntent(mission);
  const result = scaffoldApp(intent, mission.id);
  persistence.appendMissionLog(runId, "result", result.previewReadme);
  persistence.appendAuditEvent({
    event: "app.generation.completed",
    actor: "code-implementer",
    summary: result.previewReadme,
    missionId: mission.id,
    runId,
    metadata: { outputDir: result.outputDir, files: result.files }
  });
  persistence.updateMissionStatus(mission.id, mission.status, {
    metadata: { ...(mission.metadata ?? {}), outputDir: result.outputDir, files: result.files }
  });
  return result;
}

import type { BuildIntent, QuestionnaireItem } from "@agentos/shared";

const APP_KEYWORDS = [
  "standalone app",
  "build me",
  "make me an app",
  "make me a",
  "workflow",
  "automation",
  "landing page",
  "generate an app"
];

export function isAppCreationRequest(text: string) {
  const normalized = text.toLowerCase();
  return APP_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function parseBuildIntent(description: string): BuildIntent {
  const summary = description.trim().slice(0, 500);
  const questionnaire: QuestionnaireItem[] = [
    { id: "audience", prompt: "Who is the primary audience?" },
    { id: "platform", prompt: "Web app, automation, or both?" },
    { id: "must_have", prompt: "What is the one must-have feature?" }
  ];
  return {
    intentId: `intent-${Date.now()}`,
    taskType: "app_creation",
    appName: "Generated App",
    summary,
    questionnaire
  };
}

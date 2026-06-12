export type QuestionnaireItem = {
  id: string;
  prompt: string;
};

export type QuestionnaireAnswers = Record<string, string>;

export type BuildIntent = {
  intentId: string;
  taskType: "app_creation";
  appName: string;
  summary: string;
  questionnaire: QuestionnaireItem[];
  answers?: QuestionnaireAnswers;
};

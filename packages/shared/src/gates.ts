export type GateStatus = "pass" | "warn" | "fail" | "skipped" | "pending";

export type GateId = "qa" | "security" | "code_review" | "approval" | "release";

export type GateResult = {
  gateId: GateId | string;
  status: GateStatus;
  summary: string;
  artifacts?: Array<{ kind: string; content: string }>;
  command?: string;
  exitCode?: number;
  evaluatedAt?: string;
};

export function summarizeGateResults(results: GateResult[]) {
  const passed = results.filter((g) => g.status === "pass").length;
  const failed = results.filter((g) => g.status === "fail").length;
  return { passed, failed, total: results.length };
}

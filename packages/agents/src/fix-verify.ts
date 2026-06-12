export type FixVerifyOptions = {
  maxRetries?: number;
  testCommand?: string;
};

export type FixVerifyAttempt = {
  attempt: number;
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
};

export type FixVerifyResult = {
  ok: boolean;
  attempts: FixVerifyAttempt[];
  needsAttention: boolean;
};

export function resolveFixVerifyConfig() {
  return {
    maxRetries: Number(process.env.AGENTOS_FIX_VERIFY_RETRIES ?? 3),
    testCommand: process.env.AGENTOS_FIX_VERIFY_COMMAND ?? "pnpm test"
  };
}

export async function runFixVerifyLoop(
  executeTest: (command: string) => Promise<{ ok: boolean; stdout?: string; stderr?: string; exitCode?: number }>,
  options?: FixVerifyOptions
): Promise<FixVerifyResult> {
  const config = resolveFixVerifyConfig();
  const maxRetries = options?.maxRetries ?? config.maxRetries;
  const testCommand = options?.testCommand ?? config.testCommand;
  const attempts: FixVerifyAttempt[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await executeTest(testCommand);
    attempts.push({
      attempt,
      ok: result.ok,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    });
    if (result.ok) {
      return { ok: true, attempts, needsAttention: false };
    }
  }

  return { ok: false, attempts, needsAttention: true };
}

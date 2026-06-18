export type CommandAlias = { file: string; args: string[] };

/** Normalized command strings the gateway can execute via POST /execute. */
export function buildGatewayCommandAliases(pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm"): Record<string, CommandAlias> {
  return {
    "git status": { file: "git", args: ["status"] },
    "git status --short": { file: "git", args: ["status", "--short"] },
    "git diff": { file: "git", args: ["diff"] },
    "git diff --stat": { file: "git", args: ["diff", "--stat"] },
    "git diff --name-only": { file: "git", args: ["diff", "--name-only"] },
    "git log": { file: "git", args: ["log", "-5", "--oneline"] },
    "semgrep --config .semgrep.yml --error --quiet": {
      file: "semgrep",
      args: ["--config", ".semgrep.yml", "--error", "--quiet"]
    },
    "pnpm test": { file: pnpmBin, args: ["test"] },
    "pnpm typecheck": { file: pnpmBin, args: ["typecheck"] },
    "pnpm lint": { file: pnpmBin, args: ["lint"] },
    "pnpm build": { file: pnpmBin, args: ["build"] }
  };
}

export const GATEWAY_COMMAND_ALIASES = Object.keys(buildGatewayCommandAliases());

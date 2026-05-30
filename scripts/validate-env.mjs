import { existsSync, readFileSync } from "node:fs";

const envPath = existsSync(".env") ? ".env" : ".env.example";
const content = readFileSync(envPath, "utf8");

const required = [
  "AGENTOS_APP_NAME",
  "AGENTOS_DASHBOARD_NAME",
  "AGENTOS_API_PORT",
  "AGENTOS_GATEWAY_PORT",
  "AGENTOS_COMMAND_CENTER_PORT",
  "AGENTOS_MODEL_PROVIDER",
  "AGENTOS_DAILY_BUDGET_USD",
  "AGENTOS_MONTHLY_BUDGET_USD"
];

const missing = required.filter((key) => !new RegExp(`^${key}=`, "m").test(content));

if (missing.length > 0) {
  console.error(`Missing env keys in ${envPath}: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`AgentOS env check passed using ${envPath}.`);

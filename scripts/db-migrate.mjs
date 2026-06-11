import {
  CURRENT_SCHEMA_VERSION,
  SqlitePersistenceAdapter,
  findRepoRoot,
  resolveAgentOSDataPath,
  resolveLegacyAgentOSJsonPath
} from "../packages/persistence/src/index.ts";

const repoRoot = findRepoRoot(process.cwd());
const dbPath = resolveAgentOSDataPath(repoRoot);
const legacyJsonPath = resolveLegacyAgentOSJsonPath(repoRoot);

const adapter = new SqlitePersistenceAdapter(dbPath);
const imported = adapter.importFromJson(legacyJsonPath);
const snapshot = adapter.snapshot();

console.log("AgentOS SQL migration complete.");
console.log(`Local SQL state path: ${dbPath}`);
console.log(`Schema version: ${CURRENT_SCHEMA_VERSION}`);
console.log(
  `Imported legacy JSON: ${imported ? "yes" : "no"}`
);
console.log(
  `Durable entities ready: workspaces=${snapshot.workspaces.length}, operators=${snapshot.operators.length}, missions=${snapshot.missions.length}, runs=${snapshot.missionRuns.length}, approvals=${snapshot.approvals.length}.`
);

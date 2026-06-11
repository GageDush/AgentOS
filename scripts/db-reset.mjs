import {
  SqlitePersistenceAdapter,
  buildSeedDatabase,
  findRepoRoot,
  resolveAgentOSDataPath,
  resetSqliteDatabaseFile
} from "../packages/persistence/src/index.ts";

const repoRoot = findRepoRoot(process.cwd());
const dbPath = resolveAgentOSDataPath(repoRoot);

resetSqliteDatabaseFile(dbPath);
const adapter = new SqlitePersistenceAdapter(dbPath);
adapter.reset(buildSeedDatabase());

console.log("AgentOS local SQL database reset complete.");
console.log(`Reset path: ${dbPath}`);
console.log("This command is intended for local development only.");

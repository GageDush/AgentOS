import {
  SqlitePersistenceAdapter,
  buildSeedDatabase,
  findRepoRoot,
  resolveAgentOSDataPath
} from "../packages/persistence/src/index.ts";

const repoRoot = findRepoRoot(process.cwd());
const dbPath = resolveAgentOSDataPath(repoRoot);
const adapter = new SqlitePersistenceAdapter(dbPath);

adapter.reset(buildSeedDatabase());

console.log("AgentOS SQL seed complete.");
console.log(`Seeded local SQL state at: ${dbPath}`);
console.log("Default workspace/operator and mock-first seed data are ready.");
console.log("No cloud providers or unsafe integrations were seeded.");

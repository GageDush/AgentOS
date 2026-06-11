import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@agentos/agents": fromRoot("./packages/agents/src/index.ts"),
      "@agentos/config": fromRoot("./packages/config/src/index.ts"),
      "@agentos/game-schema": fromRoot("./packages/game-schema/src/index.ts"),
      "@agentos/memory": fromRoot("./packages/memory/src/index.ts"),
      "@agentos/orchestrator": fromRoot("./packages/orchestrator/src/index.ts"),
      "@agentos/persistence": fromRoot("./packages/persistence/src/index.ts"),
      "@agentos/runtime": fromRoot("./packages/runtime/src/index.ts"),
      "@agentos/sandbox": fromRoot("./packages/sandbox/src/index.ts"),
      "@agentos/shared": fromRoot("./packages/shared/src/index.ts"),
      "@agentos/token-manager": fromRoot("./packages/token-manager/src/index.ts"),
      "@agentos/tools": fromRoot("./packages/tools/src/index.ts"),
      "@agentos/ui": fromRoot("./packages/ui/src/index.ts")
    }
  }
});

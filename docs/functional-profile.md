# AgentOS functional profile

Use this env block when running the **functionalization program** (real execution + auth + cost).

```env
# Security (phase 1)
AGENTOS_API_REQUIRE_AUTH=true
AGENTOS_SESSION_MAX_AGE_SECONDS=2592000
AGENTOS_COOKIE_SAMESITE=Lax

# Intelligence (phase 2)
FEATURE_AGENT_LLM=true
FEATURE_OLLAMA=true
AGENTOS_MODEL_PROVIDER=ollama
AGENTOS_MOCK_PIPELINE=false

# Tools (phase 2.3)
FEATURE_TOOL_EXECUTION=true

# Cost (phase 3)
AGENTOS_BUDGET_DAILY_USD=5
AGENTOS_BUDGET_HARD_STOP=true

# Cloud (phase 3.3 — off until gates pass)
FEATURE_LITELLM_PROXY=false
```

Copy to `.env` selectively or merge with `.env.functional.example` when added.

Commands:

```bash
pnpm functional:start    # reset program + first task prompt
pnpm functional:gates    # run gates for current task
pnpm functional:next     # advance after gates green
pnpm functional:run      # one SDK cycle (needs CURSOR_API_KEY)
pnpm functional:loop     # continual SDK until complete or max cycles
```

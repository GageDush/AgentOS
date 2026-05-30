# Simple Codex Steps

## 1. Make a new empty folder

Open PowerShell:

```powershell
mkdir C:\Users\gaged\OneDrive\Desktop\agentos
cd C:\Users\gaged\OneDrive\Desktop\agentos
git init
```

## 2. Copy this bundle into the folder

Put these files into the new `agentos` folder:

```text
AGENTOS_MASTER_CODEX_PROMPT.md
SIMPLE_CODEX_STEPS.md
CODEX_REPAIR_PROMPT.md
docs/
assets/
asset_prompts/
```

## 3. Create the Codex task file

Create:

```text
codex-task.md
```

Paste this:

```md
Read `AGENTOS_MASTER_CODEX_PROMPT.md` completely and implement AgentOS exactly according to that specification.

Build a runnable local MVP, not just documentation.

Run the install/build/test/sanitization commands that are possible in this environment.
Fix errors encountered.
Do not claim anything works unless it was actually tested.

When finished, tell me:
1. Files created/updated.
2. Commands run.
3. Actual outputs or errors.
4. What works.
5. What does not work yet.
6. Exact next command I should run.
```

## 4. Run Codex

From inside the `agentos` folder:

```powershell
codex exec --sandbox workspace-write (Get-Content .\codex-task.md -Raw)
```

## 5. After Codex finishes, test the app

Run one at a time:

```powershell
pnpm install
```

```powershell
Copy-Item .env.example .env
```

```powershell
docker compose up -d
```

```powershell
pnpm sanitize:check
```

```powershell
pnpm env:check
```

```powershell
pnpm dev
```

## 6. Open in browser

```text
http://localhost:3000
http://localhost:8787/health
http://localhost:8790/health
```

## 7. If it fails

Use `CODEX_REPAIR_PROMPT.md`.

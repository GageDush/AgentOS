# AgentOS — Claude Cowork Tooling Inventory
_Generated 2026-06-15 · Maps every available plugin/skill/connector to AgentOS development use cases_

---

## LIVE MCP CONNECTORS
_Authenticated and ready to use right now._

---

### IcePanel
**Tools:** `icepanel_createModelObject`, `icepanel_createConnection`, `icepanel_createADR`, `icepanel_createFlows`, `icepanel_listDiagrams`, `icepanel_landscapeSearch`, and more.

**AgentOS use:** Your `scripts/icepanel-populate-diagrams.mjs` and `ICEPANEL_LANDSCAPE_ID` env var already anticipate this. With the MCP active, I can:
- Auto-populate your architecture landscape from the actual services in `docs/architecture.md`
- Create and update ADRs (SQLite vs Postgres, Discord auth vs local fallback) directly from the code
- Turn `Desktop/system-routing-schematic.md` into a living IcePanel diagram rather than a static file
- Add flows for the agent pipeline, mission lifecycle, and wiki sync sequence
- **This directly fixes "key files outside the repo" problem** — the architecture diagram becomes the source of truth, not a Desktop markdown file

**Priority: High — wire this up first for architecture docs.**

---

### Linear (two workspaces)
**Tools:** `list_issues`, `save_issue`, `get_project`, `list_cycles`, `list_milestones`, `save_document`, `get_diff`, and more. Two instances connected (`mcp__69435833-*` and `mcp__9fc4a593-cd43-*`).

**AgentOS use:**
- Pull issues into AgentOS missions — `issue-intake-researcher` (Ash intake stage) could query Linear for open backlog items and pre-populate mission context
- `release-manager` agent can create Linear tickets on merge, close them on deploy
- Replace `project-wave-runner`'s local JSON manifest with a Linear cycle — planned wave items live in Linear, runner consumes them
- `engineering:standup` skill can pull Linear cycle progress + git log for daily ops-feed posts to Discord `#ops-feed`
- ADRs created via IcePanel MCP can be cross-linked to Linear docs

**Priority: High — this is your missing issue tracker → mission pipeline link.**

---

### Figma
**Tools:** `get_design_context`, `get_screenshot`, `get_variable_defs`, `search_design_system`, `download_assets`, `add_code_connect_map`, `send_code_connect_mappings`, `create_new_file`, `upload_assets`.

**AgentOS use:**
- Pull design tokens from your Figma file directly into `packages/ui` Forge design system — no manual copy-paste of colors/typography
- Code Connect: map Figma components to your actual React components in `apps/command-center/components/` — eliminates the "which component is this design?" question when switching between Claude Design and Cursor
- Download SVGs/PNGs from Figma directly into `docs/design/agentos-dashboard-claude-design/`
- Generate FigJam diagrams of the agent pipeline or wiki structure
- `design:design-handoff` skill + Figma MCP = spec sheets generated from Figma designs, ready for Cursor implementation

**Priority: High if Forge design system is in Figma. Bridges the Claude Design → Cursor gap.**

---

### Notion
**Tools:** `notion-create-pages`, `notion-create-database`, `notion-search`, `notion-update-page`, `notion-fetch`, `notion-create-view`, `notion-duplicate-page`.

**AgentOS use:**
- External-facing project wiki that's shareable — `.agentos/memory/wiki/` is developer-internal markdown; Notion can be the public-facing version
- Sync planning documents: ChatGPT exports → Notion pages instead of local JSON files
- `product-management:stakeholder-update` skill output → Notion page → share with collaborators
- Sprint planning artifacts and roadmap live in Notion where collaborators can comment
- Agent output summaries from `memory-curator` could push to Notion for human review without needing the Forge UI

**Priority: Medium — useful when you have collaborators or want external visibility.**

---

### Airtable
**Tools:** Full CRUD on bases, tables, records, interfaces. `create_records_for_table`, `search_records`, `list_records_for_table`, `update_records_for_table`, `create_table`, `publish_interface`.

**AgentOS use:**
- Alternative to Linear for lightweight mission/task tracking with a visual board interface
- Back the `project:wave` manifest with an Airtable base instead of `project-wave-state.json` — columns: wave, task, agent, status, output
- `agent-activity-log` skill (from Airtable plugin) creates an audit log table of agent decisions — mirrors but complements the SQLite `audit_log` table for cross-AI visibility
- If you want collaborators to see mission status without accessing the Forge UI, publish an Airtable interface

**Priority: Medium — useful if you want a no-code view of missions.**

---

### Render
**Tools:** `deploy`, `get_deployment`, `get_deployment_build_logs`, `get_deployment_runtime_logs`, `list_servers`, `get_server`, `redeploy`, `stop_deployment`, `get_observability_overview`.

**AgentOS use:**
- **This is your Cloudflare Tunnel exit path.** When you're ready to move off local hosting, Render can run the entire `docker-compose.yml` stack with no tunnel dependency — `flous.dev` routes directly to Render, not `localhost`
- Spin up a staging environment that's always up, independent of your local machine
- `release-manager` agent can trigger `redeploy` on Render after a successful merge instead of running local restart scripts
- Check `get_deployment_runtime_logs` to debug the live stack without SSHing anywhere
- `get_observability_overview` for server health — pairs with the `/health` endpoint fix from the audit

**Priority: High for cloud migration. Medium for current local setup (can monitor logs now).**

---

### Slack
**Tools:** `slack_send_message`, `slack_read_channel`, `slack_create_canvas`, `slack_search_public`, `slack_schedule_message`, `slack_read_thread`, `slack_read_file`.

**AgentOS use:**
- Mirror Discord `#ops-feed` → Slack channel for status alerts — reduces Discord single-point-of-failure risk for notifications
- `slack_schedule_message` for timed release announcements or sprint kickoff messages
- Slack Canvas as an alternative wiki article viewer — `memory-curator` writes to both Slack and the local wiki
- Search past Slack conversations for project context, then feed into wiki via a sync script
- If you eventually have a team, Slack is where they'll be — not Discord

**Priority: Medium — primarily useful as Discord notification failover or if you add team members.**

---

### Sanity CMS
**Tools:** `query_documents` (GROQ), `create_documents`, `patch_document`, `publish_documents`, `semantic_search`, `list_embeddings_indices`, `create_dataset`, `deploy_schema`, `get_schema`.

**AgentOS use:**
- `semantic_search` + embeddings index: power `.agentos/memory/wiki/` search with proper vector search instead of the current manifest-based lookup — each wiki article becomes a Sanity document, semantically queryable
- If `flous.dev` grows a blog, changelog, or docs site, Sanity is the headless CMS backend
- `create_documents` from agent output — `memory-curator` could write structured documents to Sanity instead of raw markdown files
- GROQ query syntax is expressive — better for complex wiki queries than `_meta/index.json` manifest scanning

**Priority: Medium-high if you want proper semantic search over the wiki. High for public content at flous.dev.**

---

### Nimble
**Tools:** `nimble_search`, `nimble_extract`, `nimble_crawl_run`, `nimble_agents_run`, `nimble_map`.

**AgentOS use:**
- Powers `issue-intake-researcher` agent — before planning a mission, Nimble can pull GitHub issues, related docs, changelog entries, or competitor implementations
- The `/scraper` workbench route in your Command Center UI already anticipates a web scraper integration — this is it
- `nimble:competitor-intel` skill: research LangGraph, CrewAI, AutoGen, Cursor Background Agent to understand where AgentOS fits and what features to prioritize
- `nimble:live-research` skill: deep research briefs on any topic before writing a spec (`product-management:write-spec`)
- `nimble_map` to crawl your own `flous.dev` and `api.flous.dev` and surface what's publicly exposed

**Priority: Medium — most immediately useful for `issue-intake-researcher` enrichment.**

---

### HuggingFace Hub
**Tools:** `hub_repo_search`, `hub_repo_details`, `paper_search`, `hf_hub_query`, `hf_doc_fetch`, `space_search`.

**AgentOS use:**
- Research and benchmark models before pulling them into Ollama — find alternatives to `qwen2.5-coder:7b` for coding tasks
- Find embedding models for the wiki semantic search feature
- `paper_search` for academic research on agent orchestration patterns before designing new pipeline stages
- `hf_hub_query` for dataset exploration if you add fine-tuning to the roadmap

**Priority: Low-medium — most useful when evaluating Ollama model swaps.**

---

### HeyGen HyperFrames
**Tools:** `compose`, `render_video`, `list_projects`, `get_project`, `get_project_status`, `get_render_status`.

**AgentOS use:**
- Create demo videos of the Command Center for `flous.dev` landing page or release announcements without screen recording
- The `animation examples metrics related.mp4` on your Desktop suggests you're already doing video work — this automates it
- `release-manager` trigger: on merge, generate a short demo video of the new feature and post it to Discord `#round-table`
- Render promotional content to accompany `postiz` social posts on release day

**Priority: Low-medium — useful for marketing/release content, not core dev.**

---

### Mermaid Renderer
**Tools:** `validate_and_render_mermaid_diagram`.

**AgentOS use:**
- Validate and render the agent pipeline diagram before committing it to `docs/architecture/`
- Generate visual flowcharts of mission lifecycle states (queued → running → approval_gate → complete/failed)
- Render the wiki sync flow, tunnel routing schematic, or memory-curator approval queue as diagrams
- Pairs with IcePanel — draft in Mermaid to validate, then push to IcePanel for the living version

**Priority: Medium — good for docs and planning sessions.**

---

### Twilio (docs MCP)
**Tools:** `twilio__search`, `twilio__retrieve`.

**AgentOS use:**
- Look up Twilio docs when implementing SMS/voice notifications as Discord fallback
- The `twilio-verify-send-otp` skill is relevant for adding phone-based 2FA to the trusted device auth flow already in `docs/`
- Reference docs for Twilio Messaging Services if you add SMS ops alerts

**Priority: Low — reference tool only. Relevant when implementing Discord failover.**

---

## PLUGINS NEEDING AUTHENTICATION
_Installed but not yet authenticated. One-click to activate._

| Plugin | Auth needed | AgentOS use |
|--------|-------------|-------------|
| **GitHub** (`mcp__plugin_engineering_github`) | OAuth | Read/write issues, PRs, trigger Actions, read CI status — feeds `release-manager` gate checks; critical for the CI fix |
| **Datadog** (`mcp__plugin_engineering_datadog`) | API key | Monitor stack metrics if/when Render-hosted; latency, error rates, uptime |
| **PagerDuty** (`mcp__plugin_engineering_pagerduty`) | API key | On-call schedules, incident escalation — relevant if AgentOS stack becomes production-critical |
| **Amplitude** (2 instances) | API key | Product analytics for the Command Center — track mission creation rates, approval rates, agent usage |
| **Figma PM** (`mcp__plugin_product-management_figma`) | OAuth | Alternate Figma connector through the PM plugin |
| **Fireflies** | API key | Auto-transcribe planning sessions; feed transcripts into wiki via `wiki:sync` equivalent |
| **Intercom** | API key | User support if flous.dev gets external users |
| **Pendo** | API key | In-app user guidance and analytics for Command Center |
| **SimilarWeb** | API key | Competitive research — compare flous.dev traffic profile vs competitor tools |
| **Asana** | OAuth | Alternative project tracker to Linear |
| **Atlassian** | OAuth | Jira/Confluence — alternative to Linear + Notion |
| **ClickUp** | OAuth | Alternative project tracker |
| **Monday** | OAuth | Alternative project tracker |

**Most impactful to authenticate now:** GitHub — it closes the "no CI on GitHub" gap immediately and enables `release-manager` to read real CI status.

---

## SKILLS
_Built-in Claude capabilities, no additional auth required._

---

### Engineering Skills

**`engineering:architecture`** — Create/evaluate Architecture Decision Records. Use this every time you make a major call (SQLite vs Postgres, Discord vs local auth, Cloudflare vs Render). Feed ADRs into IcePanel MCP with `icepanel_createADR`.

**`engineering:code-review`** — Security, performance, correctness review. Run on `code-implementer` agent output before `release-manager` fires. Complements your existing `code-reviewer` pipeline agent with an external perspective. Can review PRs by diff.

**`engineering:debug`** — Structured debugging sessions. When the stack breaks (tunnel down, SQLite corruption, Discord bot disconnect), this gives you a systematic isolation approach instead of ad-hoc investigation.

**`engineering:deploy-checklist`** — Pre-deployment verification. Run before each project wave or major push. Pairs with `acceptance-gate.ps1`.

**`engineering:documentation`** — Write runbooks, READMEs, API docs. The `docs-agent` generates internal wiki articles; this skill produces external-facing docs: `flous.dev` docs, Fastify API endpoint docs, the `first-run.md` onboarding guide.

**`engineering:incident-response`** — Triage, communicate, write postmortems. When the tunnel goes down or Discord auth breaks, structured response vs panic-fixing.

**`engineering:standup`** — Generate standup updates from recent activity. Pull git log + Linear cycle + Discord `#ops-feed` → daily auto-generated standup. Feed to `#ops-feed` or Discord `#round-table`.

**`engineering:system-design`** — Design services and APIs. Use when planning new features: Postgres migration, real scheduling engine, hosted multi-user mode, the `agentos-mcp-server` idea.

**`engineering:tech-debt`** — Identify, prioritize tech debt. Run on the feature flag list, JSON-vs-SQLite duplication, and the deprecated Phaser office demo code. Produces a prioritized cleanup backlog.

**`engineering:testing-strategy`** — Design test plans. The Playwright e2e and Vitest unit tests exist but smoke tests are PowerShell scripts. This skill can design a proper test pyramid for the mission execution flow.

---

### Product Management Skills

**`product-management:write-spec`** — Write PRDs and feature specs. Use this before handing any new feature to Cursor or Codex — produces the scoping document that becomes a mission brief.

**`product-management:sprint-planning`** — Plan sprints with capacity and goals. Replace the `project-wave-runner` manual JSON with a structured sprint plan. The wave runner consumes sprint output.

**`product-management:roadmap-update`** — Update/reprioritize roadmap after a wave completes or feature slips. Formal priority update before starting the next wave.

**`product-management:stakeholder-update`** — Generate formatted updates. After each project wave: brief for Discord `#round-table` or a Notion page.

**`product-management:competitive-brief`** — Research comparable tools: LangGraph, CrewAI, AutoGen, Cursor Background Agent. Identify AgentOS differentiation and feature gaps.

**`product-management:metrics-review`** — Analyze product metrics with trend analysis. Review usage data from `/usage/summary` and `/usage/budgets` API endpoints — which agents fire most, which missions succeed, token burn patterns.

**`product-management:synthesize-research`** — Turn raw feedback (GitHub issues, Discord DMs, Cursor session notes) into prioritized findings and roadmap recommendations.

**`product-management:brainstorm`** — Structured brainstorming. First step before writing any spec — run this when planning a new UI section, agent capability, or integration.

---

### Design Skills

**`design:design-handoff`** — Generate developer specs from designs (layout, tokens, props, interaction states). **This directly bridges the Claude Design → Cursor gap** — Figma/Claude Design outputs become Cursor-ready specs. Combine with Figma MCP for full pipeline.

**`design:design-critique`** — Structured UI/UX feedback. Review the Claude Design outputs in `docs/design/agentos-dashboard-claude-design/` before implementing them in Cursor — catch issues before they're coded.

**`design:design-system`** — Document and audit design systems. Document the `packages/ui` Forge design system — naming conventions, component variants, token values — so all AI tools have a consistent reference. Currently this knowledge is implicit.

**`design:accessibility-review`** — WCAG 2.1 AA audit. The Forge UI uses custom dark design with `#6b9fff` cool blue. Run contrast ratio, keyboard navigation, and screen reader checks before each major UI release.

**`design:ux-copy`** — Write microcopy, error messages, empty states, CTAs. The Command Center has many UI states (awaiting_approval, paused, failed, complete, blackbox). Consistent copy for each state matters — especially in the Control Gate.

**`design:user-research`** / **`design:research-synthesis`** — Plan user testing and synthesize findings. Relevant when AgentOS has users beyond yourself.

---

### Document Creation Skills

**`docx`** — Create Word documents. Generate release notes, sprint reports, wave summaries, or stakeholder updates as proper Office documents. `docs-agent` could output DOCX reports.

**`xlsx`** — Create Excel spreadsheets. Token usage tracking, agent performance metrics, mission success rates — exportable to Excel for analysis.

**`pptx`** — Create PowerPoint decks. Project wave retrospectives, AgentOS architecture overview for potential investors/partners.

**`pdf`** — PDF creation. Package audit reports or architecture docs as PDFs for sharing without repo access.

**`canvas-design`** — Visual art in PNG/PDF. Marketing assets, agent portrait placards (the Forge UI shows agent placards), landing page visuals.

**`algorithmic-art`** — Generative art with p5.js. The boot animation and entry experience — could use generative motion graphics with the Forge dark/cool-blue aesthetic rather than static assets.

---

### Productivity & Workflow Skills

**`schedule`** — Create scheduled tasks (cron-based). **Immediately useful:** schedule `wiki:sync-cursor` to run every hour, schedule `tunnel:repair` health check every 5 minutes, schedule daily standup generation. Eliminates PowerShell Task Scheduler setup for these.

**`productivity:memory-management`** — Two-tier persistent memory for Claude across sessions. **This is the fix for Claude's cold-start problem** — the CLAUDE.md + memory directory pattern gives Claude context that persists between sessions, exactly mirroring what the wiki does for the agent system.

**`productivity:task-management`** — TASKS.md cross-session task list for Claude. Maintains developer-level tasks that survive session boundaries — complements the AgentOS mission system.

**`mcp-builder`** — Build MCP servers (Python FastMCP or TypeScript SDK). **High-value idea: build `agentos-mcp-server`** — an MCP that exposes AgentOS missions as tools. Cursor and Codex could create missions, check run status, and read wiki articles as first-class MCP tool calls instead of external web requests. Makes all 5 AI tools true citizens of AgentOS.

**`skill-creator`** — Create, improve, eval custom skills. Once your workflow patterns are solid, create custom skills: `agentos-mission` (creates a mission from a description), `flous-deploy` (runs the deploy checklist + release), `wiki-sync` (runs all sync scripts and reports status).

**`web-artifacts-builder`** — Multi-component HTML artifacts with React, Tailwind, shadcn/ui. Prototype new Command Center UI sections (mission timeline, agent presence strip, Control Gate modal) as interactive HTML artifacts before implementing in Next.js — fast iteration loop.

**`theme-factory`** — Apply themes (colors/fonts) to artifacts. Apply the Forge design system (`#6b9fff` cool blue/violet, dark background, mono labels) to any HTML artifacts, reports, or documents Claude generates.

---

### Research & Intel Skills

**`nimble:competitor-intel`** / **`nimble:company-deep-dive`** — Real-time competitor research with live web data. Research LangGraph, CrewAI, AutoGen, Cursor Background Agent to understand competitive landscape.

**`nimble:live-research`** — Deep multi-source research briefs. Use before writing any major spec — get a cited brief on the topic area first.

**`nimble:nimble-web-expert`** — Fetch any URL, scrape data, search the web. Powers `issue-intake-researcher` context enrichment, flous.dev site audits, docs scraping.

**`brightdata-plugin:competitive-intel`** — More thorough competitor analysis with pricing and feature comparisons. Useful if you eventually productize AgentOS.

**`brightdata-plugin:seo-audit`** — Technical SEO audit of flous.dev. Once the site has public content — meta tags, Core Web Vitals, structured data.

---

### Cowork / Meta Skills

**`ai-firstify`** (TechWolf) — Audit projects against 9 AI-first design principles and 7 design patterns. Run this on the AgentOS architecture — it's explicitly designed as an AI-first system, so this audit would validate the approach and surface blind spots. Costs nothing to run and could reframe several design decisions.

**`postiz:postiz`** — Schedule posts to 28+ social channels (X, LinkedIn, Bluesky, Discord, etc.). On release: `release-manager` merge → trigger Postiz → auto-announce on social channels. Discord already handles the internal announcement; Postiz handles the public-facing one.

**`cowork-plugin-management:create-cowork-plugin`** — Build a custom plugin from scratch. Package your specific AgentOS workflow skills (`agentos-mission`, `wiki-sync`, `tunnel-health`, `forge-handoff`) into an installable Claude plugin. Share with future collaborators.

**`desktop-commander`** — Persistent shells, long-running processes, filesystem access. Run the full AgentOS stack from Claude directly: `pnpm dev:full`, tail logs, manage SQLite, without needing PowerShell desktop shortcuts. Enables "run this and watch it" workflows.

**`learn`** — Deep conceptual learning. When you need to understand how something works before implementing it (e.g., SQLite WAL mode, Cloudflare Tunnel internals, Discord OAuth flow).

**`brand-guidelines`** — Apply Anthropic brand colors to artifacts. Not directly relevant but useful for any Claude-branded integrations.

---

## TOP 7 HIGHEST-LEVERAGE COMBINATIONS

These specific tool combinations unlock the most value for AgentOS right now:

### 1. `mcp-builder` skill → `agentos-mcp-server`
Build an MCP server that wraps AgentOS API endpoints. Cursor, Codex, Claude all gain: create mission, check run status, read wiki article, list agents — as tool calls. This makes all 5 AI tools first-class citizens of AgentOS rather than external users of it. **Eliminates the biggest context fragmentation problem.**

### 2. IcePanel MCP + `engineering:architecture` skill
Auto-populate the IcePanel landscape from `docs/architecture.md`, then create ADRs for every major decision going forward. Architecture diagram stays in sync with code; decision log is searchable. Replaces `Desktop/system-routing-schematic.md` with a living system.

### 3. GitHub plugin (auth it) + `engineering:standup` skill
Authenticate GitHub → I can read real CI status, PR state, commit activity. `engineering:standup` pulls Linear + GitHub + Discord ops-feed → auto-generates daily standup post to `#ops-feed`. Zero manual effort for daily status.

### 4. Linear MCP + `project:wave` pipeline
Wire Linear cycles directly to the wave runner. Each cycle = one wave. Linear issue = one wave task. `release-manager` closes Linear issues on merge. Cycle progress visible in Linear without needing the Forge UI. Eliminates `project-wave-state.json`.

### 5. Figma MCP + `design:design-handoff` skill
Pull Figma variable definitions → design tokens → `packages/ui`. Run `design:design-handoff` on Figma component specs → Cursor-ready implementation specs with layout, props, interaction states. Closes the Claude Design → Cursor handoff gap with generated artifacts.

### 6. `schedule` skill → automate the maintenance scripts
Create scheduled tasks for: `wiki:sync-cursor` (hourly), `tunnel:repair` (every 5 min), `wiki:sync-chatgpt` (daily), daily standup generation. Replaces PowerShell Task Scheduler setup for each of these — all from a single Claude session.

### 7. `productivity:memory-management` → Claude cold-start fix
Set up CLAUDE.md + memory directory pattern now. From this session forward, Claude maintains persistent context about AgentOS across sessions — mirrors what the wiki does for the agent system, but for Claude specifically. No more re-explaining the project at the start of each conversation.

---

_This inventory covers: 11 live MCP connectors, 13 plugins pending auth, and ~60 skills across engineering, product, design, research, and meta-workflow categories._

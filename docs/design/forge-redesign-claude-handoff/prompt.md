# AgentOS Forge — Claude continuation handoff (post–Wiki Map)

**Last updated:** 2026-06-16  
**Branch:** `pivot/agentos-local-command-center`

Use **`chatbox.txt`** to paste into Claude. This file is the full reference.

---

## Status summary

| Milestone | State | Notes |
|-----------|-------|-------|
| P0 shell + live home | **Done** | ForgeNav, live `/dashboard`, inspector scope |
| Wiki Map Phase 1 (Option A) | **Done** | API + Browse\|Map + React Flow |
| Control Gate handoff layout (Option B) | **Next** | Presentation only — wiring exists |
| LLM router Phase 1 | Spec only | `docs/design/llm-router-litellm-handoff/` |

---

## What's done (do not redo)

### Shell + home

| Deliverable | Key files |
|-------------|-----------|
| Hybrid shared nav | `ForgeNav.tsx`, `forge-nav-items.ts`, `forge-nav.css` |
| Live home data | `useForgeHomeData.ts`, `ForgeHome.tsx` |
| Run Inspector scope | `AgentOSLocalApp.tsx` (`showInspector` on missions / control-gate / blackbox) |
| `/dashboard` redirect | `app/dashboard/page.tsx` → `/` |
| Home polish | Loading state (no seed badge flash), footer uses `FORGE_NAV_*` |

Nav single source:

```text
apps/command-center/src/components/forge/forge-nav-items.ts
  FORGE_NAV_PRIMARY  → Dashboard, Missions, Control Gate, Blackbox
  FORGE_NAV_MORE     → Agents, Automations, Memory, OSINT Docs, …
```

### Wiki Map Phase 1 (shipped)

**Spec:** `docs/design/wiki-graph-view-spec.md`

| Layer | Location |
|-------|----------|
| API | `GET /memory/wiki/graph` in `apps/api/src/index.ts` — `buildWikiGraph`, filters archived, optional `?includeOrphans=true`, 30s cache |
| Tabs + URL state | `ForgeWikiView.tsx` — `?view=map&slug=&category=` |
| Layout | `wiki-graph-layout.ts` — category clusters, 200-node cap, ego-focus, search dim |
| Canvas | `WikiGraphCanvas.tsx`, `WikiGraphNode.tsx`, `wiki-graph.css` |
| Categories | `wiki-category.ts` (shared with browse) |
| Dependency | `@xyflow/react` in `apps/command-center/package.json` |
| SSR | `next/dynamic` + `ssr: false` for React Flow |

**Acceptance (Phase 1):** graph endpoint, Browse\|Map tabs, nodes + directed edges, click/double-click, category filter + search, Forge theme, no regression to browse/sync/rebuild.

### Stack repair (Cursor — Windows)

Stuck Node on `:3000` + deleted `.next` caused Command Center **500**. Recovery path:

| Artifact | Purpose |
|----------|---------|
| `pnpm stack:repair` | `scripts/repair-stack-force.ps1` — kill tree or **port bypass** |
| `.agentos/state/command-center-port.override` | Active UI port when bypass used (e.g. `3002`) |
| `scripts/next-dev-command-center.mjs` | Dev server reads `.env` + override |
| `scripts/agentos-control.ps1` | `Import-AgentOsPorts`, unhealthy UI detection, log lock fallback |

**Operator URLs:** If override exists, use `http://localhost:<override>/` not `:3000`. Tunnel `~/.cloudflared/config.yml` UI hostnames must match override port.

**Post-reboot cleanup (optional):** Remove override, set cloudflared UI ingress back to `3000`, `pnpm stack:restart`.

---

## Next work — pick ONE per PR

Claude should **confirm** if unclear; default recommendation is **Option B**.

### Option B — Control Gate handoff layout (recommended)

**Goal:** Match Claude Design prototype layout for `/control-gate` while preserving all live approval behavior.

**Entry points:**

```text
apps/command-center/src/app/control-gate/page.tsx
apps/command-center/src/components/local/AgentOSLocalApp.tsx   (section === "control-gate")
apps/command-center/src/components/forge/ForgeControlGateView.tsx
packages/ui — SandboxApprovalCenter, AgentRichMessageCard
```

**Must keep (do not break):**

- Props into `ForgeControlGateView`: `approvals`, `pendingApprovals`, `richMessage`, `operatorName`
- Handlers: `onAllowOnce`, `onAllowMission`, `onDeny`, `onApproveAll`, `onRichAction`
- Busy states: `busyId`, `busyBulk`, `busyRichAction`
- Pending count parity with home nav badge (`useForgeHomeData` / `/dashboard`)
- Discord session attribution (`operatorId` from cookie — wired in `AgentOSLocalApp`)
- `ForgeNav` rail on ops routes, health bar, **Run Inspector visible** on this route

**In scope:**

- Layout, typography, spacing, section hierarchy per design handoff
- Forge orange tokens (`packages/ui/src/tokens/agentos-forge.css`)
- Empty state, single pending vs queue, bulk approve affordance
- Mobile / narrow rail behavior if specified in design

**Out of scope:**

- Changing approval API routes or auto-approve policy
- New dependencies unless justified
- Porting other P2 pages (missions, agents, etc.) in the same PR

**Design references:**

- `docs/design/trusted-device-auth-wireframe.md` (gate-adjacent patterns)
- `docs/design/forge-redesign-claude-handoff/` (original P0 context)
- `apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md`
- Claude Design outputs under `docs/design/` if present

**Acceptance:**

- [ ] Pending count matches home + nav badge
- [ ] Allow once / allow mission / deny / approve all work with session cookie
- [ ] Rich message card renders when API provides it
- [ ] Screenshots or brief before/after in PR notes
- [ ] `pnpm typecheck` passes; no blue/violet primary accents

---

### Option C — Wiki Map polish (secondary)

Only if operator reports visual/UX issues after QA on Windows.

**Files:** `apps/command-center/src/components/forge/wiki/*`

**Examples:** cluster spacing, minimap placement, inspector panel copy, session/orphan toggle labels, cap banner clarity, double-click vs click affordance.

**Do not:** Rebuild API or change graph contract without spec update.

---

### Option D — LLM router Phase 1 (defer unless asked)

**Spec:** `docs/design/llm-router-litellm-handoff/prompt.md`

- New `packages/llm-router` with `routeLlmCall()`
- Optional LiteLLM sidecar `:4000`
- API `POST /llm/chat` — **not** in `apps/gateway`

---

## Commands

```powershell
cd C:\Users\gaged\Documents\AgenOS
pnpm install                    # @xyflow/react if missing
pnpm stack:repair               # if UI 500 or port stuck
pnpm stack:restart
pnpm typecheck
pnpm -C apps/command-center build
pnpm wiki:index-repo            # after wiki indexer changes
```

**Local URLs** (replace port if override file exists):

```text
http://localhost:3002/              # or :3000
http://localhost:3002/control-gate
http://localhost:3002/wiki?view=map
```

**Tunnel:** `pnpm tunnel:repair` if `flous.dev` returns 530. Maintenance: `pnpm tunnel:maintenance -On`.

---

## Constraints (hard)

1. Do not break mission pipeline or approval gates
2. Do not reintroduce blue/violet Halo primaries — orange Forge `#FF6A35`
3. One focused PR per option — no batch P2 page ports
4. Do not switch Postgres or add autonomous execution without gates
5. Verify on Windows after changes (Cursor sandbox cannot render React Flow)
6. Ask before duplicate routes or core flow changes

---

## Suggested Claude opener

> P0 + Wiki Map Phase 1 are done. Start **Option B** — Control Gate handoff layout in `ForgeControlGateView`. Keep all approval wiring; presentation only. One PR.

or

> Wiki Map QA found [specific issue]. Do **Option C** polish only: [list].

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `docs/design/wiki-graph-view-spec.md` | Wiki Map spec (Phase 1 done) |
| `docs/design/llm-router-litellm-handoff/prompt.md` | LLM router (not started) |
| `docs/NEXT_STEPS.md` | Repo-wide open items |
| `.tunnel/README.md` | Tunnel watchdog + maintenance flag |

---

## Short status line

> P0 + Wiki Map done. Stack repair on Windows (`pnpm stack:repair`, port override). Next: **Control Gate handoff layout** (Option B) — one PR, keep live approval wiring.

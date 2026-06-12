/** AgentOS scoping form — step definitions */
window.AGENTOS_SCOPING_STEPS = [
  {
    id: "meta",
    title: "About you",
    subtitle: "Takes ~15–25 min if you include all projects. Progress saves automatically.",
    fields: [
      { id: "filledBy", label: "Your name", type: "text", required: true },
      { id: "filledDate", label: "Date", type: "date", required: true }
    ]
  },
  {
    id: "global",
    title: "Global defaults",
    subtitle: "Applies across projects unless a project overrides.",
    fields: [
      { id: "overallTarget", label: "Overall target (when should P1–P8 be done?)", type: "text", placeholder: "e.g. 2026-07-15 or Sprint 12" },
      {
        id: "defaultImplementer",
        label: "Default implementer mode",
        type: "radio",
        options: ["gateway", "cursor", "both", "mock-only"]
      },
      {
        id: "defaultHosting",
        label: "Default hosting goal",
        type: "radio",
        options: ["local-only", "docker-compose", "VPS+tunnel", "k8s", "defer"]
      },
      {
        id: "ciPlatform",
        label: "CI platform",
        type: "radio",
        options: ["GitLab", "GitHub Actions", "both", "local-only"]
      },
      { id: "projectOrder", label: "Project execution order", type: "text", placeholder: "P1,P2,P3,P4,P5,P8,P6,P7" },
      { id: "projectsSkip", label: "Projects to SKIP entirely", type: "text", placeholder: "e.g. P9,P6" },
      { id: "crossCutting", label: "Cross-cutting notes", type: "textarea", placeholder: "Budget, team size, must-ship-by…" }
    ]
  },
  {
    id: "p1",
    title: "P1 — Implementer realism",
    subtitle: "Spine project · tools, fix-verify, gateway/Cursor (steps 141–150)",
    projectKey: "P1",
    fields: [
      { id: "p1_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p1_priority", label: "Priority (1=now, 9=later)", type: "number", min: 1, max: 9 },
      { id: "p1_target", label: "Target completion", type: "text" },
      {
        id: "p1_modes",
        label: "Implementer modes",
        type: "checkbox",
        options: ["gateway only", "cursor only", "gateway + cursor", "mock for CI/demo"]
      },
      {
        id: "p1_tools",
        label: "Tools in scope",
        type: "checkbox",
        options: ["Read", "Grep", "Shell", "Write/Edit (patch apply)"]
      },
      { id: "p1_toolsOther", label: "Other tools", type: "text" },
      { id: "p1_maxIterations", label: "Max tool-call iterations per run", type: "number", placeholder: "8" },
      { id: "p1_maxMinutes", label: "Max wall-clock minutes (implementer phase)", type: "number", placeholder: "30" },
      {
        id: "p1_fixVerify",
        label: "Fix-verify on test failure",
        type: "radio",
        options: ["YES with retries", "NO — human retry only"]
      },
      { id: "p1_fixRetries", label: "If YES — number of retries", type: "number", placeholder: "2" },
      { id: "p1_gateCommands", label: "Commands requiring Control Gate", type: "textarea", placeholder: "git push, rm, chmod…" },
      { id: "p1_noWritePaths", label: "Paths never writable (globs)", type: "text", placeholder: ".env, **/secrets/**" },
      {
        id: "p1_repoRoots",
        label: "Allowed repo roots",
        type: "checkbox",
        options: ["monorepo only", "AGENTOS_OUTPUT_DIR", "other (note below)"]
      },
      { id: "p1_repoRootsOther", label: "Other repo root", type: "text" },
      {
        id: "p1_llm",
        label: "LLM for implementer",
        type: "checkbox",
        options: ["Ollama local", "Cloud when enabled", "Mock-only OK for merge gate"]
      },
      { id: "p1_demo", label: "Success demo (one sentence)", type: "textarea", required: true },
      { id: "p1_outOfScope", label: "Out of scope", type: "textarea" },
      { id: "p1_blockers", label: "Blockers / dependencies", type: "textarea" }
    ]
  },
  {
    id: "p2",
    title: "P2 — Quality gates",
    subtitle: "QA, security, code review, UI, Discord (steps 151–160)",
    projectKey: "P2",
    fields: [
      { id: "p2_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p2_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p2_target", label: "Target completion", type: "text" },
      {
        id: "p2_gates",
        label: "Gates in scope",
        type: "checkbox",
        options: ["QA (test/typecheck)", "Security (semgrep)", "Code review (diff)", "All three"]
      },
      {
        id: "p2_semgrep",
        label: "Semgrep",
        type: "radio",
        options: ["required", "optional", "skip — use pnpm test/lint only"]
      },
      { id: "p2_semgrepPath", label: "Semgrep rules path", type: "text" },
      { id: "p2_minDiff", label: "Min diff to trigger code review", type: "text", placeholder: "50 lines or 3 files" },
      {
        id: "p2_ui",
        label: "UI surfaces",
        type: "checkbox",
        options: ["Timeline gate chips", "Blackbox gate panel", "Discord failure card", "Control Gate waive"]
      },
      {
        id: "p2_onFail",
        label: "On gate FAIL",
        type: "radio",
        options: ["block run", "warn and continue", "operator choice per gate"]
      },
      {
        id: "p2_waive",
        label: "Waive allowed",
        type: "radio",
        options: ["never", "human approve + audit", "Discord button only"]
      },
      { id: "p2_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p2_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p3",
    title: "P3 — Release execution",
    subtitle: "Git commit/push, PR, Release UI (steps 161–170)",
    projectKey: "P3",
    fields: [
      { id: "p3_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p3_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p3_target", label: "Target completion", type: "text" },
      {
        id: "p3_branch",
        label: "Branch strategy",
        type: "radio",
        options: ["feature branch per mission", "current branch", "other"]
      },
      { id: "p3_branchOther", label: "If other — describe", type: "text" },
      {
        id: "p3_commitAuthor",
        label: "Commit author",
        type: "radio",
        options: ["operator git config", "AgentOS bot", "env AGENTOS_GIT_*"]
      },
      {
        id: "p3_push",
        label: "Push target",
        type: "radio",
        options: ["origin only", "fork", "no push"]
      },
      {
        id: "p3_humanApprove",
        label: "Release always needs human approve",
        type: "radio",
        options: ["YES", "NO", "env-flag only"]
      },
      {
        id: "p3_autopilot",
        label: "Autopilot PR",
        type: "radio",
        options: ["yes", "no", "dry-run only"]
      },
      { id: "p3_githubRepo", label: "GitHub repo", type: "text", placeholder: "GageDush/AgentOS" },
      { id: "p3_prTemplate", label: "PR template must include", type: "textarea" },
      {
        id: "p3_issueOnStart",
        label: "Create GitHub issue on mission start",
        type: "radio",
        options: ["YES", "NO"]
      },
      {
        id: "p3_ui",
        label: "UI",
        type: "checkbox",
        options: ["Release panel", "Discord release card", "Extend quick action release"]
      },
      { id: "p3_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p3_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p4",
    title: "P4 — Live dev UX",
    subtitle: "WebSocket /events, connection state (steps 21–22, 185–186)",
    projectKey: "P4",
    fields: [
      { id: "p4_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p4_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p4_target", label: "Target completion", type: "text" },
      {
        id: "p4_routes",
        label: "Routes that must be live",
        type: "checkbox",
        options: ["/dashboard", "/missions", "/blackbox", "/control-gate", "all Forge routes"]
      },
      {
        id: "p4_events",
        label: "Event types",
        type: "checkbox",
        options: ["run status", "mission logs", "approvals", "gate results", "quota warnings"]
      },
      { id: "p4_eventsOther", label: "Other event types", type: "text" },
      {
        id: "p4_wsFallback",
        label: "If WebSocket fails",
        type: "radio",
        options: ["poll fallback", "offline banner only", "both"]
      },
      { id: "p4_pollSeconds", label: "Poll interval (seconds)", type: "number", placeholder: "5" },
      {
        id: "p4_offlineBanner",
        label: "Offline API banner",
        type: "radio",
        options: ["YES", "NO"]
      },
      {
        id: "p4_tunnelDemo",
        label: "flous.dev tunnel required for demo",
        type: "radio",
        options: ["YES", "NO"]
      },
      {
        id: "p4_polish",
        label: "Polish scope",
        type: "checkbox",
        options: ["full MAX polish all routes", "live events only — polish later"]
      },
      { id: "p4_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p4_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p5",
    title: "P5 — Discord test parity + CI",
    subtitle: "D-04–D-17",
    projectKey: "P5",
    fields: [
      { id: "p5_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p5_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p5_target", label: "Target completion", type: "text" },
      {
        id: "p5_ciPlatform",
        label: "CI platform (this project)",
        type: "radio",
        options: ["GitLab", "GitHub Actions", "both", "local only"]
      },
      {
        id: "p5_ciJobs",
        label: "CI jobs to add",
        type: "checkbox",
        options: ["discord:test", "discord:smoke:full (nightly)", "DISCORD_LIVE_SMOKE", "acceptance:gate"]
      },
      {
        id: "p5_workPackages",
        label: "Test work packages",
        type: "checkbox",
        options: ["D-04 rich-actions", "D-08 outbox", "D-09 rest 429", "D-10 registry", "D-11 round-table", "D-13 integration", "D-14 E2E", "D-16 live-smoke"]
      },
      {
        id: "p5_tokenInCi",
        label: "Discord token in CI",
        type: "radio",
        options: ["YES protected vars", "NO mock only"]
      },
      { id: "p5_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p5_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p6",
    title: "P6 — Hosted scale",
    subtitle: "Postgres, Redis/BullMQ, multi-worker (steps 171–174)",
    projectKey: "P6",
    fields: [
      { id: "p6_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p6_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p6_target", label: "Target completion", type: "text" },
      {
        id: "p6_hosting",
        label: "Hosting target",
        type: "radio",
        options: ["docker compose only", "VPS + tunnel", "Kubernetes", "defer — SQLite OK"]
      },
      {
        id: "p6_postgres",
        label: "Postgres tables",
        type: "radio",
        options: ["all tables", "missions+runs only", "custom"]
      },
      { id: "p6_postgresCustom", label: "Custom tables note", type: "text" },
      {
        id: "p6_redis",
        label: "Redis",
        type: "radio",
        options: ["BullMQ required", "stub OK for now"]
      },
      { id: "p6_workers", label: "Number of worker instances", type: "number", placeholder: "1" },
      {
        id: "p6_sameMachine",
        label: "Workers on same machine as API",
        type: "radio",
        options: ["YES", "NO"]
      },
      {
        id: "p6_scheduler",
        label: "Scheduler cron accuracy",
        type: "radio",
        options: ["minute", "hour", "manual only"]
      },
      {
        id: "p6_migrate",
        label: "Migrate existing SQLite data",
        type: "radio",
        options: ["YES", "NO", "export script OK"]
      },
      { id: "p6_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p6_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p7",
    title: "P7 — Memory curator",
    subtitle: "Vector search, approval queue (steps 178–180)",
    projectKey: "P7",
    fields: [
      { id: "p7_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p7_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p7_target", label: "Target completion", type: "text" },
      {
        id: "p7_vectorRequired",
        label: "Vector search required for P7 done",
        type: "radio",
        options: ["YES", "NO — keyword enough"]
      },
      {
        id: "p7_backend",
        label: "Vector backend",
        type: "radio",
        options: ["sqlite-vss", "pgvector", "in-memory dev only"]
      },
      {
        id: "p7_types",
        label: "Memory types",
        type: "checkbox",
        options: ["project facts", "code ownership", "operator preferences", "risk areas", "mission outcomes"]
      },
      {
        id: "p7_approve",
        label: "Memory writes need human approve",
        type: "radio",
        options: ["always", "auto low-risk", "curator only"]
      },
      {
        id: "p7_ui",
        label: "UI",
        type: "checkbox",
        options: ["Forge memory queue", "Discord approve button", "API only"]
      },
      { id: "p7_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p7_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p8",
    title: "P8 — Ship",
    subtitle: "CI E2E, docker, release tag (steps 187–190)",
    projectKey: "P8",
    fields: [
      { id: "p8_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "DEFER"], required: true },
      { id: "p8_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p8_target", label: "Target completion", type: "text" },
      { id: "p8_tag", label: "Tag name", type: "text", placeholder: "agentos-complete-v1.0.0" },
      {
        id: "p8_e2e",
        label: "E2E in every MR",
        type: "radio",
        options: ["YES", "nightly", "manual only"]
      },
      { id: "p8_mergeChecks", label: "Required checks before merge", type: "textarea" },
      {
        id: "p8_docker",
        label: "Docker images",
        type: "checkbox",
        options: ["api", "worker", "gateway", "command-center", "full compose"]
      },
      { id: "p8_registry", label: "Container registry", type: "text" },
      {
        id: "p8_criteria",
        label: "Release criteria for tag",
        type: "checkbox",
        options: ["acceptance:gate green", "E2E specs green", "discord:smoke:full", "flous.dev demo", "P1 implementer demo"]
      },
      {
        id: "p8_audience",
        label: "Release notes audience",
        type: "radio",
        options: ["self", "public GitHub", "Discord post"]
      },
      { id: "p8_demo", label: "Success demo (one sentence)", type: "textarea" },
      { id: "p8_outOfScope", label: "Out of scope", type: "textarea" }
    ]
  },
  {
    id: "p9",
    title: "P9 — App intake (optional)",
    subtitle: "Secondary lane · iframe inspect (step 123)",
    projectKey: "P9",
    fields: [
      { id: "p9_include", label: "Include this project?", type: "radio", options: ["YES", "NO", "SKIP"], required: true },
      { id: "p9_priority", label: "Priority (1–9)", type: "number", min: 1, max: 9 },
      { id: "p9_target", label: "Target completion", type: "text" },
      {
        id: "p9_inspect",
        label: "Inspect mode",
        type: "checkbox",
        options: ["iframe preview only", "click-to-select + feedback", "full visual editor"]
      },
      { id: "p9_outputDir", label: "AGENTOS_OUTPUT_DIR", type: "text" },
      {
        id: "p9_preview",
        label: "Preview served from",
        type: "radio",
        options: ["API route", "static export", "other"]
      },
      {
        id: "p9_regen",
        label: "Feedback → regen loop",
        type: "radio",
        options: ["required", "nice-to-have"]
      },
      { id: "p9_demo", label: "Success demo (one sentence)", type: "textarea" }
    ]
  },
  {
    id: "signoff",
    title: "Sign-off & export",
    subtitle: "Review and copy your answers for Cursor chat.",
    fields: [
      { id: "z_risk", label: "Biggest risk if we ship without finishing included projects", type: "textarea" },
      { id: "z_metric", label: 'Single metric that means "AgentOS is a real software developer" to you', type: "textarea" },
      { id: "z_other", label: "Anything else", type: "textarea" }
    ]
  }
];

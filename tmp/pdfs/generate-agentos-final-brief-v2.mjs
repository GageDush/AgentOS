import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const repo = "C:/Users/gaged/Documents/AgenOS";
const outDir = path.join(repo, "output/pdf");
fs.mkdirSync(outDir, { recursive: true });

const htmlPath = path.join(outDir, "AgentOS-Final-Audit-Advisory-Brief.html");
const pdfPath = path.join(outDir, "AgentOS-Final-Audit-Advisory-Brief.pdf");
const previewPath = path.join(outDir, "AgentOS-Final-Audit-Advisory-Brief-html-preview.png");

const asset = (relativePath) => pathToFileURL(path.join(repo, relativePath)).href;

const diagrams = [
  ["agent-pipeline.md-1.png", "Agent pipeline"],
  ["approval-gate-sequence.md-1.png", "Approval gate sequence"],
  ["containers.md-1.png", "Containers"],
  ["context.md-1.png", "Context"],
  ["mission-run-sequence.md-1.png", "Mission run sequence"],
  ["oauth-sequence.md-1.png", "OAuth sequence"],
  ["ui-routes.md-1.png", "UI routes"],
  ["wiki-sync-sequence.md-1.png", "Wiki sync sequence"]
];

const diagramFigure = ([file, caption]) => `
  <figure class="diagram">
    <img src="${asset(`docs/diagrams/rendered/${file}`)}" alt="${caption}">
    <figcaption>${caption}</figcaption>
  </figure>`;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AgentOS Final Audit and Advisory Brief</title>
  <style>
    @page { size: Letter; margin: 0.55in 0.62in; }
    * { box-sizing: border-box; }
    html { background: #f4f0eb; }
    body {
      margin: 0;
      color: #191512;
      background: #f8f5ef;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 10.2pt;
      line-height: 1.48;
    }
    .page { break-after: page; page-break-after: always; min-height: 9.35in; position: relative; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .cover {
      margin: -0.55in -0.62in;
      padding: 0.62in;
      min-height: 11in;
      color: #f5f2ee;
      background:
        linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px),
        radial-gradient(circle at 78% 12%, rgba(255,106,53,0.18), transparent 2.9in),
        linear-gradient(160deg, #0a0908 0%, #131110 50%, #0a0908 100%);
      background-size: 36px 36px, 36px 36px, auto, auto;
    }
    .cover-inner { display: grid; grid-template-columns: 1fr 2.15in; gap: 0.42in; min-height: 9.25in; align-items: stretch; }
    .cover-main { display: flex; flex-direction: column; justify-content: space-between; }
    .cover-logo { height: 0.46in; width: 2.45in; object-fit: contain; object-position: left center; }
    .cover h1 { margin: 1.0in 0 0.12in; font-size: 39pt; line-height: 0.98; letter-spacing: -0.015em; }
    .cover .subtitle { max-width: 6in; margin: 0; color: #cbc3b8; font-size: 13.6pt; line-height: 1.42; }
    .cover-rule { width: 1.35in; height: 4px; background: #ff6a35; margin: 0.33in 0; border-radius: 999px; }
    .cover-note {
      border-left: 4px solid #ff6a35;
      background: rgba(255,106,53,0.08);
      padding: 0.18in 0.22in;
      color: #f5f2ee;
      max-width: 6.4in;
    }
    .cover-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.12in; margin-top: 0.36in; }
    .meta-box {
      border: 1px solid rgba(255,255,255,0.11);
      background: rgba(28,26,23,0.76);
      padding: 0.12in;
      border-radius: 8px;
      min-height: 0.72in;
    }
    .meta-box b { display: block; color: #fff3ee; font-size: 19pt; line-height: 1; }
    .meta-box span { display: block; color: #a89d92; margin-top: 0.05in; font-size: 8.3pt; }
    .cover-side {
      display: flex;
      flex-direction: column;
      gap: 0.16in;
      border-left: 1px solid rgba(255,255,255,0.1);
      padding-left: 0.22in;
    }
    .brand-tile {
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.035);
      border-radius: 10px;
      padding: 0.16in;
    }
    .brand-tile img { display: block; max-width: 100%; max-height: 0.58in; object-fit: contain; object-position: left center; }
    .brand-tile p { margin: 0.08in 0 0; color: #a89d92; font-size: 8.6pt; }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25in;
      padding-bottom: 0.12in;
      margin-bottom: 0.25in;
      border-bottom: 2px solid #191512;
    }
    .doc-header img { height: 0.31in; max-width: 1.7in; object-fit: contain; object-position: right center; }
    .kicker {
      margin: 0 0 0.035in;
      color: #c0360a;
      font-family: Consolas, "Cascadia Mono", monospace;
      font-size: 7.8pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1, h2, h3, p { margin: 0; }
    h2 { font-size: 20pt; line-height: 1.1; letter-spacing: -0.01em; color: #191512; }
    h3 { font-size: 11.8pt; margin-bottom: 0.05in; color: #191512; }
    p { color: #423a34; }
    .lead { font-size: 11.6pt; color: #302b28; line-height: 1.54; }
    .muted { color: #6a5f56; }
    .mono { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.6pt; color: #5a1505; }
    .section { margin-bottom: 0.23in; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.18in; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.14in; }
    .card {
      background: #fffdf8;
      border: 1px solid #dfd5c9;
      border-radius: 8px;
      padding: 0.16in;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card.dark {
      color: #f5f2ee;
      background: #1c1a17;
      border-color: #302b28;
    }
    .card.dark h3, .card.dark p { color: #f5f2ee; }
    .callout {
      margin: 0.16in 0;
      padding: 0.14in 0.17in;
      border-left: 4px solid #ff6a35;
      background: #fff3ee;
      color: #302b28;
      break-inside: avoid;
    }
    .callout b { color: #191512; }
    .callout.risk { border-left-color: #ef4545; background: #fff0f0; }
    .callout.good { border-left-color: #22c97a; background: #ecfff5; }
    ul { margin: 0.06in 0 0 0.18in; padding: 0; color: #423a34; }
    li { margin: 0.035in 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.1in; break-inside: avoid; }
    th, td { border-bottom: 1px solid #dfd5c9; padding: 0.065in 0.07in; text-align: left; vertical-align: top; }
    th {
      background: #1c1a17;
      color: #f5f2ee;
      font-family: Consolas, "Cascadia Mono", monospace;
      font-size: 7.6pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    td { color: #302b28; }
    .tight td { padding: 0.047in 0.06in; }
    .pill { display: inline-block; padding: 0.025in 0.065in; border-radius: 999px; font-family: Consolas, "Cascadia Mono", monospace; font-size: 7.4pt; font-weight: 700; }
    .pass { background: #d9f8e8; color: #0d6b3f; }
    .fail { background: #ffe2e2; color: #9d1f1f; }
    .warn { background: #fff0c9; color: #875500; }
    .stat { display: flex; align-items: baseline; gap: 0.07in; }
    .stat b { font-size: 27pt; line-height: 1; color: #191512; }
    .stat span { color: #6a5f56; font-size: 8.8pt; }
    .barrow { display: grid; grid-template-columns: 1.35in 1fr 0.42in; gap: 0.08in; align-items: center; margin: 0.07in 0; }
    .barrow span { color: #302b28; }
    .barrow b { text-align: right; color: #191512; }
    .bar { height: 0.105in; background: #e8e3db; border-radius: 999px; overflow: hidden; }
    .bar i { display: block; height: 100%; background: #ff6a35; }
    .figure {
      margin: 0.14in 0;
      padding: 0.08in;
      background: #fffdf8;
      border: 1px solid #dfd5c9;
      border-radius: 8px;
      break-inside: avoid;
    }
    .figure img { width: 100%; max-height: 3.95in; object-fit: contain; display: block; }
    .figure figcaption { margin-top: 0.06in; color: #635650; font-size: 8.4pt; text-align: center; }
    .diagram-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.12in; }
    .diagram {
      margin: 0;
      padding: 0.06in;
      background: #fffdf8;
      border: 1px solid #dfd5c9;
      border-radius: 7px;
      break-inside: avoid;
    }
    .diagram img { width: 100%; height: 1.72in; object-fit: contain; display: block; background: #fff; }
    .diagram figcaption { margin-top: 0.035in; color: #302b28; text-align: center; font-weight: 700; font-size: 7.8pt; }
    .checkpoint {
      display: grid;
      grid-template-columns: 0.38in 1fr;
      gap: 0.12in;
      border-top: 1px solid #dfd5c9;
      padding: 0.12in 0;
      break-inside: avoid;
    }
    .checkpoint-num {
      width: 0.31in;
      height: 0.31in;
      border-radius: 999px;
      background: #ff6a35;
      color: #0a0908;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 9.2pt;
    }
    .risk-row {
      display: grid;
      grid-template-columns: 0.82in 1fr 0.42in;
      gap: 0.1in;
      align-items: center;
      padding: 0.075in 0;
      border-bottom: 1px solid #dfd5c9;
    }
    .risk-row b { color: #c0360a; font-family: Consolas, "Cascadia Mono", monospace; font-size: 7.8pt; text-transform: uppercase; }
    .risk-row strong { text-align: right; font-size: 14pt; }
    .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: space-between;
      gap: 0.2in;
      color: #857870;
      border-top: 1px solid #dfd5c9;
      padding-top: 0.055in;
      font-size: 7.8pt;
    }
    .appendix-note { font-size: 8.7pt; color: #635650; margin-bottom: 0.1in; }
  </style>
</head>
<body>
  <section class="page cover">
    <div class="cover-inner">
      <div class="cover-main">
        <div>
          <img class="cover-logo" src="${asset("apps/command-center/public/forge/agentos-wordmark.svg")}" alt="AgentOS">
          <h1>Final Audit and Advisory Brief</h1>
          <div class="cover-rule"></div>
          <p class="subtitle">A top-down control-plane assessment of AgentOS, updated to use the intended Forge identity: warm-dark surfaces, molten orange accents, operational copy, and a document-first advisory format.</p>
          <div class="cover-note">
            <b>Executive verdict:</b> AgentOS is a credible local-first agent operations shell. It should be positioned as an operational control plane until route security, UI serving reliability, persistence integrity, and real agent execution paths are hardened.
          </div>
          <div class="cover-meta">
            <div class="meta-box"><b>1,505</b><span>repo files inventoried</span></div>
            <div class="meta-box"><b>127</b><span>API route declarations</span></div>
            <div class="meta-box"><b>21/21</b><span>profiles pass benchmark policy</span></div>
            <div class="meta-box"><b>4/8</b><span>current e2e pass on existing stack</span></div>
          </div>
        </div>
        <p class="muted">Prepared June 16, 2026. Sources include Claude/Cursor review artifacts, fresh local smoke tests, benchmark outputs, AgentOS repo assets, and the AgentOS Remix design package.</p>
      </div>
      <aside class="cover-side">
        <div class="brand-tile"><img src="${asset("apps/command-center/public/forge/agentos-mark.svg")}" alt="AgentOS mark"><p>AgentOS mark - local-first command center identity.</p></div>
        <div class="brand-tile"><img src="${asset("apps/command-center/public/forge/flous-wordmark.svg")}" alt="flous.dev"><p>flous.dev parent brand for public-facing surfaces.</p></div>
        <div class="brand-tile"><p class="kicker">Document style</p><p>Dark cover and header assets. Light advisory pages. Normal selectable report text. Graphics are evidence, not the whole brief.</p></div>
      </aside>
    </div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Executive summary</p><h2>What Changed in This Revision</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-wordmark.svg")}" alt="AgentOS">
    </div>
    <div class="section">
      <p class="lead">This brief has been restyled to reflect what AgentOS is supposed to be: a calm, local-first AI agent command center under the Forge identity. The report is intentionally document-first. The cover and headers use AgentOS assets, the palette uses warm near-black and molten orange, and the body pages use readable report text with selective charts, tables, and diagrams.</p>
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>AgentOS Product Posture</h3>
        <ul>
          <li>AgentOS is an operational tool, not a generic SaaS marketing page.</li>
          <li>Copy should be direct: missions, agents, runs, approvals, memory, skills, staging.</li>
          <li>Navigation and labels should avoid theatrical or militarized language.</li>
          <li>The dashboard should feel dense, calm, schematic, and work-focused.</li>
        </ul>
      </div>
      <div class="card">
        <h3>Forge Visual Scheme</h3>
        <ul>
          <li>Background: warm near-black <span class="mono">#0A0908</span>, not pure black.</li>
          <li>Accent: molten orange <span class="mono">#FF6A35</span>, used sparingly for focus and action.</li>
          <li>Surfaces: <span class="mono">#131110</span>, <span class="mono">#1C1A17</span>, <span class="mono">#262320</span>.</li>
          <li>Type intent: Inter for UI, JetBrains Mono for IDs/logs/status.</li>
        </ul>
      </div>
    </div>
    <div class="callout good">
      <b>Design-system update now reflected in the report:</b> the AgentOS Remix package was compared against the repo. Brand assets already matched. The missing Forge compatibility token bridge was added at <span class="mono">apps/command-center/src/styles/forge-ds/tokens/forge-compat.css</span> and imported from the design-system barrel.
    </div>
    <table>
      <thead><tr><th>Update</th><th>Evidence</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Restyled audit brief</td><td>Converted from dashboard-like dark cards to a professional advisory document using AgentOS header assets and normal report text.</td><td><span class="pill pass">Done</span></td></tr>
        <tr><td>Design package reconciliation</td><td>Remix zips confirmed: token package plus SVG brand assets. Repo assets already matched package assets.</td><td><span class="pill pass">Done</span></td></tr>
        <tr><td>Forge compat bridge</td><td>Added missing legacy <span class="mono">--forge-*</span> aliases to align package tokens with current app consumers.</td><td><span class="pill pass">Done</span></td></tr>
        <tr><td>Verification</td><td><span class="mono">pnpm --filter @agentos/command-center typecheck</span> and <span class="mono">build</span> pass. Forge preview screenshot renders correctly.</td><td><span class="pill pass">Done</span></td></tr>
      </tbody>
    </table>
    <div class="footer"><span>AgentOS brief v2</span><span>1</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Finding synthesis</p><h2>Final Analysis of Claude and Cursor Findings</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-mark.svg")}" alt="AgentOS mark">
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>Confirmed</h3>
        <ul>
          <li>Single live repo root is <span class="mono">C:/Users/gaged/Documents/AgenOS</span>.</li>
          <li>Fastify API, SQLite state, gateway, worker, scheduler, Discord, scraper, and Forge UI are real implementations.</li>
          <li>Operational route security remains the highest priority.</li>
          <li>Persistence is real but still risky: foreign keys off, weak indexing story, and full-database rewrite paths remain.</li>
        </ul>
      </div>
      <div class="card">
        <h3>Updated by Fresh Evidence</h3>
        <ul>
          <li>The LLM router is now partly wired into <span class="mono">apps/api/src/providers.ts</span> for the API Ollama provider.</li>
          <li>The core agent executor still uses direct Ollama/prompt fallback.</li>
          <li>Runtime mission usage remains zero-token/zero-cost in completion paths.</li>
          <li>Default unit tests are currently flaky under parallel API test execution.</li>
        </ul>
      </div>
    </div>
    <table>
      <thead><tr><th>Area</th><th>Prior Review Position</th><th>Final Analysis</th></tr></thead>
      <tbody>
        <tr><td><b>Core product shape</b></td><td>Real backend/control plane, mock-by-default intelligence.</td><td>Confirmed with refinement. API provider uses <span class="mono">routeLlmCall</span>; agent executor still bypasses it.</td></tr>
        <tr><td><b>Build and tests</b></td><td>Prior smoke had typecheck, tests, env, sanitize, and build green.</td><td>Current result is mixed: typecheck/build/env/sanitize pass; default tests flake under parallel API execution.</td></tr>
        <tr><td><b>UI validation</b></td><td>Fresh UI can render; background stack can enter route 500/offline state.</td><td>Confirmed deeper. Background command center returned HTTP 500 for core routes; logs show missing Next dev manifests.</td></tr>
        <tr><td><b>Security</b></td><td>Unauth operational API and SSRF-capable scraper are P0.</td><td>Confirmed. No global auth preHandler was found; scraper still accepts broad URLs.</td></tr>
        <tr><td><b>Persistence</b></td><td>SQLite real but foreign keys off and full rewrite path remains.</td><td>Confirmed. <span class="mono">foreign_keys = OFF</span> and saveDatabase rewrites logical tables.</td></tr>
        <tr><td><b>Design system</b></td><td>Cursor/Claude handoff points toward Forge orange identity.</td><td>Confirmed and now included in the brief. Repo has most of it; compat bridge was the missing package piece.</td></tr>
      </tbody>
    </table>
    <div class="callout">
      <b>Advisory interpretation:</b> AgentOS is beyond a prototype UI, but the production claim should stay narrow until authZ, reliable UI serving, real agent execution, and persistence hardening are proven with repeatable tests.
    </div>
    <div class="footer"><span>Final analysis</span><span>2</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Smoke evidence</p><h2>Top-Down Smoke Test Results</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-icon.svg")}" alt="AgentOS icon">
    </div>
    <div class="grid3 section">
      <div class="card"><p class="kicker">Repo health</p><div class="stat"><b>Pass</b></div><p>typecheck, build, env, sanitize, profile validation, smoke scripts, and benchmarks passed.</p></div>
      <div class="card"><p class="kicker">Default tests</p><div class="stat"><b>Flaky</b></div><p>Default <span class="mono">pnpm test</span> failed two Discord timeout tests; same tests passed serially.</p></div>
      <div class="card"><p class="kicker">UI runtime</p><div class="stat"><b>Fail</b></div><p>Existing command center on 3010 returned HTTP 500 for core routes while API proxy health was 200.</p></div>
    </div>
    <table class="tight">
      <thead><tr><th>Gate</th><th>Status</th><th>Evidence</th></tr></thead>
      <tbody>
        <tr><td>Typecheck</td><td><span class="pill pass">Pass</span></td><td>25.4s</td></tr>
        <tr><td>Build</td><td><span class="pill pass">Pass</span></td><td>49.9s; Next compiled and generated 63 static pages.</td></tr>
        <tr><td>Env and sanitize</td><td><span class="pill pass">Pass</span></td><td>Env check 0.97s; sanitize checked 859 product-facing files.</td></tr>
        <tr><td>Profile validation</td><td><span class="pill pass">Pass</span></td><td>21 profiles, tiers, and 2 contracts validated.</td></tr>
        <tr><td>Default unit suite</td><td><span class="pill fail">Fail</span></td><td>276/278; two Discord timeout failures under default parallelism.</td></tr>
        <tr><td>API serial tests</td><td><span class="pill pass">Pass</span></td><td>88/88 when API suite runs with file parallelism disabled.</td></tr>
        <tr><td>Discord serial target</td><td><span class="pill pass">Pass</span></td><td>71/71 when run serially.</td></tr>
        <tr><td>Mission smoke</td><td><span class="pill pass">Pass</span></td><td>Gateway live; runtime mission smoke passed.</td></tr>
        <tr><td>Tool smoke</td><td><span class="pill pass">Pass</span></td><td>Gateway live; tool golden path and mission smoke passed.</td></tr>
        <tr><td>E2E existing stack</td><td><span class="pill fail">Fail</span></td><td>4/8; UI route checks hit Internal Server Error.</td></tr>
        <tr><td>API route sweep</td><td><span class="pill pass">Pass</span></td><td>Key API/gateway endpoints returned 200.</td></tr>
        <tr><td>flous.dev status</td><td><span class="pill fail">Fail</span></td><td>HTTP 500 during stack status check.</td></tr>
      </tbody>
    </table>
    <div class="callout good">
      <b>One-time vs repeatable:</b> isolated API and Discord tests pass, so the unit failure appears concurrency-sensitive. The command-center route failure is repeatable in the current background stack and should be treated as active until route smoke is green.
    </div>
    <div class="footer"><span>Smoke tests</span><span>3</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Metrics</p><h2>Project and Benchmark Snapshot</h2></div>
      <img src="${asset("apps/command-center/public/forge/flous-mark.svg")}" alt="flous">
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>Repository Shape</h3>
        <div class="barrow"><span>Files inventoried</span><div class="bar"><i style="width:100%"></i></div><b>1,505</b></div>
        <div class="barrow"><span>TS/TSX</span><div class="bar"><i style="width:23%"></i></div><b>339</b></div>
        <div class="barrow"><span>Tests/specs</span><div class="bar"><i style="width:6%; background:#22c97a"></i></div><b>91</b></div>
        <div class="barrow"><span>Markdown docs</span><div class="bar"><i style="width:10%; background:#f5a623"></i></div><b>143</b></div>
        <div class="barrow"><span>Scripts/tools</span><div class="bar"><i style="width:4%; background:#ef4545"></i></div><b>59</b></div>
        <p class="muted">Also observed: 12 packages, 5 apps, and 21 agent profiles.</p>
      </div>
      <div class="card">
        <h3>Benchmark Signals</h3>
        <div class="barrow"><span>Profile policy</span><div class="bar"><i style="width:100%; background:#22c97a"></i></div><b>21/21</b></div>
        <div class="barrow"><span>Profile average</span><div class="bar"><i style="width:91%; background:#22c97a"></i></div><b>91</b></div>
        <div class="barrow"><span>Pipeline missions</span><div class="bar"><i style="width:100%"></i></div><b>8</b></div>
        <div class="barrow"><span>Wiki char savings</span><div class="bar"><i style="width:33%; background:#f5a623"></i></div><b>33%</b></div>
        <div class="barrow"><span>E2E current</span><div class="bar"><i style="width:50%; background:#ef4545"></i></div><b>4/8</b></div>
        <p class="muted">Fresh wiki benchmark: avg section expand 469.35 ms, avg context packet 660.83 ms, avg char savings 33.3%, API live.</p>
      </div>
    </div>
    <div class="grid2">
      <div class="card">
        <h3>API Route Sweep</h3>
        <table class="tight">
          <tbody>
            <tr><td>/health</td><td>200</td><td>150 ms</td><td>110 B</td></tr>
            <tr><td>/dashboard</td><td>200</td><td>590 ms</td><td>522 KB</td></tr>
            <tr><td>/agents/roster</td><td>200</td><td>24 ms</td><td>1.5 KB</td></tr>
            <tr><td>/missions</td><td>200</td><td>59 ms</td><td>12.9 KB</td></tr>
            <tr><td>/approvals</td><td>200</td><td>52 ms</td><td>10.2 KB</td></tr>
            <tr><td>/memory/queue</td><td>200</td><td>51 ms</td><td>26.4 KB</td></tr>
            <tr><td>/llm/routes</td><td>200</td><td>28 ms</td><td>517 B</td></tr>
            <tr><td>gateway /health</td><td>200</td><td>30 ms</td><td>98 B</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Performance Interpretation</h3>
        <ul>
          <li>Build health is strong enough to support ongoing product work.</li>
          <li>Dashboard payload is heavy at roughly 522 KB and 590 ms local response time.</li>
          <li>Wiki context compression is promising, but packet build time should be monitored as the wiki grows.</li>
          <li>E2E failures are not API latency; they are page-serving failures.</li>
        </ul>
      </div>
    </div>
    <div class="footer"><span>Metrics</span><span>4</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Architecture</p><h2>Current System Assessment</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-mark.svg")}" alt="AgentOS mark">
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>What Is Real</h3>
        <ul>
          <li>Fastify API with 127 route declarations.</li>
          <li>Gateway with <span class="mono">spawn(shell:false)</span> and an alias map.</li>
          <li>SQLite persistence with WAL and 21 logical entities.</li>
          <li>Worker/scheduler loops and routeable mission lifecycle.</li>
          <li>Discord gateway/OAuth/components, Puppeteer scraper, memory wiki, and LLM router package.</li>
        </ul>
      </div>
      <div class="card">
        <h3>What Is Not Real Enough Yet</h3>
        <ul>
          <li>Agent pipeline still relies on mock/local execution controls.</li>
          <li><span class="mono">packages/agents/src/llm.ts</span> still falls back to prompt echo and does not use <span class="mono">routeLlmCall</span>.</li>
          <li>Mission usage remains zero-token/zero-cost in runtime paths.</li>
          <li>System health reports worker/gateway as online without real probes.</li>
          <li>Cloud routes are gated off and LiteLLM is sidecar-only.</li>
        </ul>
      </div>
    </div>
    <figure class="figure">
      <img src="${asset("docs/diagrams/rendered/containers.md-1.png")}" alt="Container architecture diagram">
      <figcaption>Container architecture diagram from Cursor rendered diagram set.</figcaption>
    </figure>
    <div class="callout">
      <b>Architecture conclusion:</b> describe AgentOS as a local-first agent operations/control plane. Do not claim production autonomous agent platform until non-mock execution, real usage accounting, authZ, and route reliability are proven.
    </div>
    <div class="footer"><span>Architecture</span><span>5</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Risk advisory</p><h2>Risk Register and Priority Stack</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-icon.svg")}" alt="AgentOS icon">
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>Highest Risks</h3>
        <div class="risk-row"><b>Critical</b><span>Unauth operational API</span><strong>95</strong></div>
        <div class="risk-row"><b>Critical</b><span>Unauth SSRF scraper</span><strong>95</strong></div>
        <div class="risk-row"><b>High</b><span>Command-center route 500s</span><strong>82</strong></div>
        <div class="risk-row"><b>High</b><span>Real agent path incomplete</span><strong>78</strong></div>
        <div class="risk-row"><b>High</b><span>Persistence rewrite and FKs off</span><strong>76</strong></div>
        <div class="risk-row"><b>High</b><span>Secrets at rest and child env</span><strong>74</strong></div>
      </div>
      <div class="card">
        <h3>Risk Heatmap</h3>
        <div class="barrow"><span>Security exposure</span><div class="bar"><i style="width:95%; background:#ef4545"></i></div><b>95</b></div>
        <div class="barrow"><span>UI reliability</span><div class="bar"><i style="width:82%; background:#f5a623"></i></div><b>82</b></div>
        <div class="barrow"><span>Agent truth</span><div class="bar"><i style="width:78%; background:#f5a623"></i></div><b>78</b></div>
        <div class="barrow"><span>Persistence</span><div class="bar"><i style="width:76%; background:#f5a623"></i></div><b>76</b></div>
        <div class="barrow"><span>CI confidence</span><div class="bar"><i style="width:63%"></i></div><b>63</b></div>
        <div class="barrow"><span>Observability</span><div class="bar"><i style="width:54%"></i></div><b>54</b></div>
        <div class="callout risk"><b>Priority:</b> authZ and scraper lock-down first, then command-center route reliability and CI flake, then persistence and real agent runtime.</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Immediate Control</th><th>Reason</th><th>Acceptance Evidence</th></tr></thead>
      <tbody>
        <tr><td>Global auth preHandler</td><td>Route-by-route protection is too easy to miss.</td><td>Unauth tests show 401/403 for mutations, worker, events, scraper, Discord admin.</td></tr>
        <tr><td>Scraper SSRF guard</td><td>Current URL validation is too broad for a browser-based downloader.</td><td>Tests block loopback, RFC1918, link-local, metadata IPs, redirects, file/data URLs.</td></tr>
        <tr><td>Command-center artifact repair</td><td>Current stack produces route-level HTTP 500.</td><td>Route sweep returns 200 on /, /missions, /control-gate, /settings, /blackbox.</td></tr>
        <tr><td>Test determinism</td><td>Default suite fails while serial suite passes.</td><td>Default CI command passes twice consecutively or has explicit serial configuration.</td></tr>
      </tbody>
    </table>
    <div class="footer"><span>Risk advisory</span><span>6</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Design update</p><h2>AgentOS Forge Design-System Update</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-wordmark.svg")}" alt="AgentOS">
    </div>
    <div class="section">
      <p class="lead">The uploaded AgentOS Remix packages are a design-system handoff, not a PDF theme. They define the product identity AgentOS should use: warm near-black operational surfaces, molten orange primary accent, normal work language, and simple branded assets. The repo had already absorbed most of this handoff; the update completed the missing compatibility bridge and records the scheme here.</p>
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>Package Reconciliation</h3>
        <ul>
          <li>Brand SVGs in the zip matched <span class="mono">apps/command-center/public/forge</span>.</li>
          <li>Base token files for color, spacing, motion, and shadows were already present.</li>
          <li>The repo kept a better Next-safe typography setup by hoisting the Google font import to the design-system barrel.</li>
          <li>The missing package file was <span class="mono">tokens/forge-compat.css</span>.</li>
        </ul>
      </div>
      <div class="card">
        <h3>Applied Change</h3>
        <ul>
          <li>Added <span class="mono">apps/command-center/src/styles/forge-ds/tokens/forge-compat.css</span>.</li>
          <li>Imported that bridge from <span class="mono">apps/command-center/src/styles/forge-ds/index.css</span>.</li>
          <li>Preserved existing shared UI overrides in <span class="mono">@agentos/ui/styles/agentos-forge.css</span>.</li>
          <li>Verified command-center typecheck and production build after the change.</li>
        </ul>
      </div>
    </div>
    <figure class="figure">
      <img src="${asset("output/playwright/agentos-forge-design-preview.png")}" alt="Forge design preview screenshot">
      <figcaption>Rendered Forge component gallery after the design-system compatibility update.</figcaption>
    </figure>
    <div class="callout good">
      <b>Result:</b> the report now reflects the intended AgentOS identity while staying readable as a professional advisory brief. The app-side design-system bridge is also documented as part of the audit record.
    </div>
    <div class="footer"><span>Design-system update</span><span>7</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Roadmap</p><h2>Checkpoint Plan With Subtasks</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-wordmark.svg")}" alt="AgentOS">
    </div>
    <div class="checkpoint"><div class="checkpoint-num">0</div><div><h3>Stabilize CI and Artifacts</h3><p class="muted">0-7 days</p><ul><li>Fix parallel Discord test flake or configure deterministic serialization.</li><li>Make e2e blocking after route smoke is green.</li><li>Repair Next dev/prod artifact hygiene and use one authoritative command-center port.</li><li>Exit: typecheck, build, default test, discord:test, e2e all green.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">1</div><div><h3>Lock Security Doors</h3><p class="muted">1-2 weeks</p><ul><li>Add Fastify auth preHandler for mutating, worker, Discord admin, event, and scraper routes.</li><li>Add SSRF guard for loopback, link-local, private CIDRs, file/data schemes, and redirects.</li><li>Restrict CORS, shorten sessions, add rate limits, and minimize child process env.</li><li>Exit: route-class auth and scraper SSRF tests passing.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">2</div><div><h3>Make UI Truthful and Reliable</h3><p class="muted">2-3 weeks</p><ul><li>Remove or relabel synthetic LIVE widgets.</li><li>Add stale-while-revalidate route state instead of full offline collapse.</li><li>Add route sweep for /, /missions, /control-gate, /settings, /blackbox.</li><li>Reduce dashboard payload from 522 KB toward less than 150 KB.</li><li>Exit: Playwright 8/8 and dashboard p95 under 150 ms local.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">3</div><div><h3>Harden Persistence</h3><p class="muted">3-5 weeks</p><ul><li>Adopt real migrations and one schema source.</li><li>Enable foreign keys and indexes for missions, logs, audit, chat, approvals.</li><li>Move hot writes off load-all/delete-all/reinsert-all mutation paths.</li><li>Add retention/pruning for audit/log/message growth.</li><li>Exit: concurrent run test shows no clobbering.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">4</div><div><h3>Make Agents Real</h3><p class="muted">5-8 weeks</p><ul><li>Wire <span class="mono">routeLlmCall</span> into <span class="mono">packages/agents/src/llm.ts</span>.</li><li>Move agent pipeline into a non-mock path; keep mock as a test double.</li><li>Emit real token/cost usage events on mission completion.</li><li>Exit: Ollama-backed mission produces real model output, diff, non-zero tokens, and budget evidence.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">5</div><div><h3>Sandbox and Tool Expansion</h3><p class="muted">8-10 weeks</p><ul><li>Replace alias-only shell with constrained sandbox/container.</li><li>Broaden tools behind policy, approvals, and audit.</li><li>Add approval-required-for-write tests and sandbox escape tests.</li><li>Exit: human-approved repo edit runs safely end-to-end.</li></ul></div></div>
    <div class="checkpoint"><div class="checkpoint-num">6</div><div><h3>Observe and Host</h3><p class="muted">10-14 weeks</p><ul><li>Add metrics endpoint for latency, queue depth, run outcomes, token/cost.</li><li>Stream logs via SSE/WS instead of polling.</li><li>Containerize stack, parameterize host paths, repair flous.dev HTTP 500.</li><li>Exit: fresh machine deploy reaches health and core UI routes.</li></ul></div></div>
    <div class="footer"><span>Roadmap</span><span>8</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Rendered docs</p><h2>Cursor Rendered Diagram Set</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-mark.svg")}" alt="AgentOS mark">
    </div>
    <p class="appendix-note">Included from <span class="mono">docs/diagrams/rendered</span>. The folder contains eight rendered Mermaid diagrams, each as SVG and PNG, generated at 2026-06-16T15:19:20.573Z.</p>
    <div class="diagram-grid">
      ${diagrams.map(diagramFigure).join("\n")}
    </div>
    <div class="footer"><span>Diagram appendix</span><span>9</span></div>
  </section>

  <section class="page">
    <div class="doc-header">
      <div><p class="kicker">Close</p><h2>Advisory Brief Close</h2></div>
      <img src="${asset("apps/command-center/public/forge/agentos-wordmark.svg")}" alt="AgentOS">
    </div>
    <div class="grid2 section">
      <div class="card">
        <h3>Recommended Immediate Next Step</h3>
        <p>Do not broaden feature scope first. Establish a trustworthy operating baseline: route authZ, SSRF guard, deterministic tests, and green command-center route smoke. That gives every later agent-runtime improvement a safer foundation.</p>
      </div>
      <div class="card">
        <h3>Recommended Positioning</h3>
        <p>Use "local-first AI agent command center" and "agent operations control plane." Avoid "production autonomous platform" until the runtime path proves real model output, real edits, real token/cost accounting, and real sandbox enforcement.</p>
      </div>
    </div>
    <div class="callout risk">
      <b>Go/no-go guidance:</b> AgentOS is ready for focused local development and controlled demos. It is not ready for exposed hosted use or unsupervised autonomous repo work until the P0/P1 issues in this brief are closed.
    </div>
    <table>
      <thead><tr><th>Evidence Type</th><th>Location</th></tr></thead>
      <tbody>
        <tr><td>Updated brief</td><td><span class="mono">output/pdf/AgentOS-Final-Audit-Advisory-Brief.pdf</span></td></tr>
        <tr><td>Report source</td><td><span class="mono">output/pdf/AgentOS-Final-Audit-Advisory-Brief.html</span></td></tr>
        <tr><td>Design-system bridge</td><td><span class="mono">apps/command-center/src/styles/forge-ds/tokens/forge-compat.css</span></td></tr>
        <tr><td>Visual preview evidence</td><td><span class="mono">output/playwright/agentos-forge-design-preview.png</span></td></tr>
      </tbody>
    </table>
    <div class="footer"><span>Final recommendation</span><span>10</span></div>
  </section>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, "utf8");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1500 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: previewPath, fullPage: true });
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  });
} finally {
  await browser.close();
}

const pdfBytes = fs.statSync(pdfPath).size;
const htmlBytes = fs.statSync(htmlPath).size;
const previewBytes = fs.statSync(previewPath).size;
console.log(JSON.stringify({ htmlPath, htmlBytes, pdfPath, pdfBytes, previewPath, previewBytes }, null, 2));

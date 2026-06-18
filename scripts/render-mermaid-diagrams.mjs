import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const diagramsDir = join(repoRoot, ".agentos", "memory", "wiki", "areas", "diagrams");
const outputRoot = join(repoRoot, "docs", "diagrams", "rendered");
const tempDir = join(outputRoot, ".tmp");
const configPath = join(tempDir, "mermaid.config.json");
const puppeteerConfigPath = join(tempDir, "puppeteer.config.json");
const indexPath = join(outputRoot, "index.md");

function runMmdc(args) {
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(pnpmBin, ["dlx", "@mermaid-js/mermaid-cli", ...args], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    const stderr =
      result.stderr?.trim() ||
      result.stdout?.trim() ||
      result.error?.message ||
      `Mermaid CLI exited with status ${result.status}`;
    throw new Error(stderr);
  }
}

function main() {
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });
  mkdirSync(tempDir, { recursive: true });

  const mermaidConfig = {
    theme: "dark",
    securityLevel: "strict",
    flowchart: { curve: "basis" }
  };
  writeFileSync(configPath, JSON.stringify(mermaidConfig, null, 2));
  const puppeteerConfig = {
    executablePath: "C:/Users/gaged/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };
  writeFileSync(puppeteerConfigPath, JSON.stringify(puppeteerConfig, null, 2));

  const files = readdirSync(diagramsDir).filter((name) => name.endsWith(".md")).sort();

  for (const fileName of files) {
    const sourcePath = join(diagramsDir, fileName);
    runMmdc(["-i", sourcePath, "-o", join(outputRoot, `${fileName}.svg`), "-e", "svg", "-c", configPath, "-p", puppeteerConfigPath, "-a", outputRoot, "-q"]);
    runMmdc(["-i", sourcePath, "-o", join(outputRoot, `${fileName}.png`), "-e", "png", "-c", configPath, "-p", puppeteerConfigPath, "-a", outputRoot, "-b", "#0A0F1A", "-w", "2200", "-q"]);
  }

  const lines = [
    "# Rendered Mermaid Diagrams",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Diagram Source | Rendered SVG (from markdown) | Rendered PNG (from markdown) |",
    "|---|---|---|"
  ];

  for (const fileName of files) {
    // Mermaid CLI appends `-1` for the first diagram block extracted from markdown.
    const svgName = `${fileName}-1.svg`;
    const pngName = `${fileName}-1.png`;
    lines.push(`| \`${fileName}\` | [${svgName}](./${svgName}) | [${pngName}](./${pngName}) |`);
  }

  writeFileSync(indexPath, `${lines.join("\n")}\n`);
  rmSync(tempDir, { recursive: true, force: true });

  console.log(`Rendered Mermaid markdown assets for ${files.length} file(s) to docs/diagrams/rendered`);
  console.log(`Index: docs/diagrams/rendered/index.md`);
}

main();

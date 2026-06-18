#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(__dirname, "..", "..");

export const AUTH_CLASSES = new Set([
  "public-read",
  "authenticated-read",
  "authenticated-mutate",
  "operator-admin",
  "internal-only"
]);

const ROUTE_RE =
  /app\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*["']([^"']+)["'](?:\s*,\s*\{\s*websocket\s*:\s*true)?/g;

/** @returns {{ method: string, path: string, websocket?: boolean }[]} */
export function extractRoutes(sourceText) {
  const routes = [];
  for (const match of sourceText.matchAll(ROUTE_RE)) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const websocket = /websocket\s*:\s*true/.test(match[0]);
    routes.push({
      method: websocket ? "WS" : method,
      path,
      websocket
    });
  }
  return routes;
}

/** @returns {{ path: string, methods: Set<string>, class: string, notes: string }[]} */
export function parseMatrix(matrixText) {
  const rows = [];
  for (const line of matrixText.split("\n")) {
    if (!line.startsWith("| `")) continue;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 3 || cells[0] === "Route") continue;
    const path = cells[0].replace(/^`|`$/g, "");
    const methods = new Set(
      cells[1]
        .split(/[,/]/)
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean)
    );
    const authClass = cells[2];
    const notes = cells[3] ?? "";
    rows.push({ path, methods, class: authClass, notes });
  }
  return rows;
}

function findMatrixRow(rows, path, method) {
  return rows.find((row) => row.path === path && methodMatches(row.methods, method));
}

function methodMatches(documented, actual) {
  if (documented.has("*") || documented.has("ALL")) return true;
  if (documented.has(actual)) return true;
  if (actual === "WS" && documented.has("GET")) return true;
  return false;
}

/**
 * @param {{ matrixText: string, indexSource: string, scraperSource: string }} sources
 */
export function validateAuthMatrix(sources) {
  const errors = [];
  const indexRoutes = extractRoutes(sources.indexSource).map((r) => ({ ...r, file: "index.ts" }));
  const scraperRoutes = extractRoutes(sources.scraperSource).map((r) => ({ ...r, file: "scraper/routes.ts" }));
  const routes = [...indexRoutes, ...scraperRoutes];
  const matrix = parseMatrix(sources.matrixText);

  const requiredSnippets = ["/health", "/missions", "/worker/process", "/scraper/", "/events", "/auth/"];
  for (const snippet of requiredSnippets) {
    if (!sources.matrixText.includes(snippet)) {
      errors.push(`matrix missing required snippet: ${snippet}`);
    }
  }

  for (const row of matrix) {
    if (!AUTH_CLASSES.has(row.class)) {
      errors.push(`invalid class "${row.class}" for ${row.path}`);
    }
  }

  const seen = new Set();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const documented = findMatrixRow(matrix, route.path, route.method);
    if (!documented) {
      errors.push(`undocumented route: ${route.method} ${route.path} (${route.file})`);
    }
  }

  return { ok: errors.length === 0, errors, routeCount: routes.length, matrixCount: matrix.length };
}

export function loadAndValidateAuthMatrix() {
  const matrixPath = join(repoRoot, "docs", "architecture", "api-auth-matrix.md");
  const indexPath = join(repoRoot, "apps", "api", "src", "index.ts");
  const scraperPath = join(repoRoot, "apps", "api", "src", "scraper", "routes.ts");
  return validateAuthMatrix({
    matrixText: readFileSync(matrixPath, "utf8"),
    indexSource: readFileSync(indexPath, "utf8"),
    scraperSource: readFileSync(scraperPath, "utf8")
  });
}

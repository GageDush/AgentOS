import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { redactSecrets, stripUserQueryTags } from "./redact";

export type CursorTranscriptEntry = {
  role: string;
  text: string;
};

export type CursorSessionSummary = {
  sessionId: string;
  relPath: string;
  isSubagent: boolean;
  title: string;
  userGoals: string[];
  outcomes: string[];
  filesMentioned: string[];
  packagesMentioned: string[];
  messageCount: number;
  updatedAt: string;
  excerpt: string;
};

function extractTextFromMessage(message: unknown) {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const typed = block as { type?: string; text?: string };
    if (typed.type === "text" && typed.text) {
      parts.push(typed.text);
    }
  }
  return parts.join("\n").trim();
}

export function parseCursorJsonl(content: string): CursorTranscriptEntry[] {
  const entries: CursorTranscriptEntry[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as { role?: string; message?: unknown };
      const role = row.role ?? "unknown";
      const text = redactSecrets(extractTextFromMessage(row.message));
      if (!text || text === "[REDACTED]") continue;
      entries.push({ role, text });
    } catch {
      continue;
    }
  }
  return entries;
}

function extractRepoPaths(text: string) {
  const paths = new Set<string>();
  for (const match of text.matchAll(/\b(?:apps|packages|scripts|docs|\.agentos)\/[A-Za-z0-9_./-]+/g)) {
    paths.add(match[0].replace(/\\/g, "/"));
  }
  for (const match of text.matchAll(/\bpackages\/[a-z0-9-]+/gi)) {
    paths.add(match[0].toLowerCase());
  }
  for (const match of text.matchAll(/\bapps\/[a-z0-9-]+/gi)) {
    paths.add(match[0].toLowerCase());
  }
  return [...paths].slice(0, 24);
}

export function summarizeCursorTranscript(
  sessionId: string,
  relPath: string,
  entries: CursorTranscriptEntry[],
  updatedAt: string
): CursorSessionSummary {
  const isSubagent = relPath.includes("/subagents/");
  const userMessages = entries
    .filter((entry) => entry.role === "user")
    .map((entry) => stripUserQueryTags(entry.text))
    .filter(Boolean);

  const assistantMessages = entries
    .filter((entry) => entry.role === "assistant")
    .map((entry) => entry.text.replace(/\[REDACTED\]/g, "").trim())
    .filter((text) => text.length > 80);

  const titleSource = userMessages[0] ?? `Cursor session ${sessionId.slice(0, 8)}`;
  const title = redactSecrets(titleSource).replace(/\s+/g, " ").slice(0, 140);

  const userGoals = [...new Set(userMessages.map((msg) => msg.slice(0, 220)))].slice(0, 8);
  const outcomes = assistantMessages.slice(-4).map((msg) => msg.slice(0, 400));

  const haystack = entries.map((entry) => entry.text).join("\n");
  const filesMentioned = extractRepoPaths(haystack);
  const packagesMentioned = filesMentioned
    .map((path) => path.match(/^(packages\/[a-z0-9-]+)/i)?.[1]?.toLowerCase())
    .filter(Boolean) as string[];

  const excerptParts = [];
  for (const entry of entries.slice(-6)) {
    const label = entry.role === "user" ? "User" : "Assistant";
    excerptParts.push(`**${label}:** ${entry.text.slice(0, 500)}`);
  }

  return {
    sessionId,
    relPath,
    isSubagent,
    title,
    userGoals,
    outcomes,
    filesMentioned,
    packagesMentioned: [...new Set(packagesMentioned)],
    messageCount: entries.length,
    updatedAt,
    excerpt: excerptParts.join("\n\n").slice(0, 2400)
  };
}

export function sessionWikiSlug(summary: CursorSessionSummary) {
  if (summary.isSubagent) {
    return `sessions/cursor/subagents/${summary.sessionId}`;
  }
  return `sessions/cursor/${summary.sessionId}`;
}

export function buildSessionWikiBody(summary: CursorSessionSummary) {
  const related = [
    ...summary.packagesMentioned.map((pkg) => `- [[${pkg}]]`),
    ...summary.filesMentioned
      .filter((path) => !path.startsWith("packages/"))
      .slice(0, 6)
      .map((path) => `- \`${path}\``)
  ];

  return [
    `# ${summary.title}`,
    "",
    `Cursor chat session (\`${summary.sessionId}\`). Source: \`${summary.relPath}\`.`,
    "",
    "## Metadata",
    "",
    `- Messages: ${summary.messageCount}`,
    `- Updated: ${summary.updatedAt}`,
    `- Type: ${summary.isSubagent ? "subagent" : "primary"}`,
    "",
    "## User goals",
    "",
    ...(summary.userGoals.length
      ? summary.userGoals.map((goal) => `- ${goal}`)
      : ["- _(no user messages parsed)_"]),
    "",
    "## Outcomes",
    "",
    ...(summary.outcomes.length
      ? summary.outcomes.map((outcome) => `- ${outcome}`)
      : ["- _(no assistant outcomes yet)_"]),
    "",
    related.length ? "## Related repo paths\n\n" + related.join("\n") : "",
    "",
    "## Recent excerpt",
    "",
    summary.excerpt || "_Empty excerpt._",
    "",
    "## Related",
    "",
    "- [[sessions/cursor/index]]",
    "- [[flows/cursor-memory]]",
    "- [[index]]"
  ]
    .filter(Boolean)
    .join("\n");
}

export function findCursorTranscriptsDir(repoRoot: string) {
  const configured = process.env.AGENTOS_CURSOR_TRANSCRIPTS_DIR?.trim();
  if (configured && existsSync(configured)) return configured;

  const repoLeaf = basename(repoRoot).toLowerCase();
  const projectsDir = join(homedir(), ".cursor", "projects");
  if (!existsSync(projectsDir)) return undefined;

  for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const normalized = entry.name.toLowerCase();
    if (!normalized.includes(repoLeaf) && !normalized.includes("agenos")) continue;
    const candidate = join(projectsDir, entry.name, "agent-transcripts");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function listCursorTranscriptFiles(transcriptsDir: string) {
  const files: Array<{ absPath: string; relPath: string; sessionId: string }> = [];

  function walk(dir: string, prefix = "") {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      if (!entry.name.endsWith(".jsonl")) continue;
      const sessionId = basename(entry.name, ".jsonl");
      files.push({ absPath: abs, relPath: rel.replace(/\\/g, "/"), sessionId });
    }
  }

  walk(transcriptsDir);
  return files.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export function loadCursorSessionSummary(absPath: string, relPath: string, sessionId: string) {
  const raw = readFileSync(absPath, "utf8");
  const entries = parseCursorJsonl(raw);
  const updatedAt = statSync(absPath).mtime.toISOString();
  return summarizeCursorTranscript(sessionId, relPath, entries, updatedAt);
}

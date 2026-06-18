import { findRepoRoot } from "@agentos/persistence";
import { loadWikiArticle, rebuildWikiManifest, upsertWikiArticle } from "@agentos/memory";
import type { AgentHouseSpec } from "./agent-houses";
import { agentJournalWikiSlug, buildAgentHouseSpecs } from "./agent-houses";
import type { HouseVisit } from "./house-visits";
import { personaDiscordName, resolvePersona } from "./personas";

function mergeWikiSection(body: string, section: string, patch: string) {
  const header = `## ${section}`;
  const normalizedPatch = patch.trim();
  if (body.includes(normalizedPatch.slice(0, Math.min(80, normalizedPatch.length)))) {
    return body;
  }

  const headerIndex = body.indexOf(header);
  if (headerIndex >= 0) {
    const afterHeader = body.slice(headerIndex + header.length);
    const nextHeader = afterHeader.search(/\n## /);
    const sectionBody = nextHeader >= 0 ? afterHeader.slice(0, nextHeader) : afterHeader;
    const insertion = sectionBody.trimEnd() ? `\n- ${normalizedPatch}` : `\n- ${normalizedPatch}`;
    if (nextHeader >= 0) {
      return `${body.slice(0, headerIndex + header.length)}${sectionBody}${insertion}${afterHeader.slice(nextHeader)}`;
    }
    return `${body.slice(0, headerIndex + header.length)}${sectionBody}${insertion}\n`;
  }

  return `${body.trimEnd()}\n\n${header}\n\n- ${normalizedPatch}\n`;
}

function journalBody(spec: AgentHouseSpec) {
  const profileSlug = `agents/${spec.agentId}`;
  return [
    `# Dream journal`,
    "",
    `Personal reflections, visit notes, and downtime processing for **${personaDiscordName(spec.persona)}**.`,
    "",
    "## Recent thoughts",
    "_Visit summaries and dream notes append here._",
    "",
    "## Visits",
    "_Guest visit log — appended when a house visit ends._",
    "",
    "## Related",
    `- [[${profileSlug}]]`,
    "- [[index]]"
  ].join("\n");
}

export function ensureAgentJournalStubs(repoRoot?: string, specs = buildAgentHouseSpecs()) {
  const root = repoRoot ?? findRepoRoot(process.cwd());
  const slugs: string[] = [];

  for (const spec of specs) {
    upsertWikiArticle(
      root,
      spec.wikiJournalSlug,
      `${spec.persona.characterName} — Dream Journal`,
      ["agent", "journal", "neighborhood", spec.agentId],
      journalBody(spec),
      { sourceAgent: "admin-agent", runId: `house-journal-${spec.agentId}` }
    );
    slugs.push(spec.wikiJournalSlug);
  }

  rebuildWikiManifest(root);
  return { count: slugs.length, slugs };
}

export function appendVisitToHostJournal(
  hostAgentId: string,
  visit: HouseVisit,
  summary: string,
  reason: string,
  repoRoot?: string
) {
  const root = repoRoot ?? findRepoRoot(process.cwd());
  const slug = visit.wikiJournalSlug || agentJournalWikiSlug(hostAgentId);
  const loaded = loadWikiArticle(root, slug);
  const persona = resolvePersona(hostAgentId);
  const guests = visit.guests.map((id) => personaDiscordName(resolvePersona(id))).join(", ");
  const at = new Date().toISOString().slice(0, 19);
  const visitLine = `**${at}** — Guests: ${guests}. Topic: ${visit.topic}. Closed: ${reason}.`;
  const thoughtLine = `**${at}** — ${summary}`;

  let body =
    loaded?.body ??
    [
      "# Dream journal",
      "",
      `Personal reflections for **${personaDiscordName(persona)}**.`,
      "",
      "## Recent thoughts",
      "",
      "## Visits",
      ""
    ].join("\n");

  body = mergeWikiSection(body, "Visits", visitLine);
  body = mergeWikiSection(body, "Recent thoughts", thoughtLine);

  upsertWikiArticle(
    root,
    slug,
    `${persona.characterName} — Dream Journal`,
    ["agent", "journal", "neighborhood", hostAgentId, "visit"],
    body,
    { sourceAgent: hostAgentId, runId: `house-visit-${visit.startedAt}` }
  );
  rebuildWikiManifest(root);
  return slug;
}

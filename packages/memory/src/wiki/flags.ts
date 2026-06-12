export function isMemoryWikiEnabled() {
  const raw = process.env.FEATURE_MEMORY_WIKI?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function isMemoryWikiWriteEnabled() {
  const writeRaw = process.env.AGENTOS_MEMORY_WIKI_WRITE?.trim().toLowerCase();
  if (writeRaw === "false" || writeRaw === "0" || writeRaw === "no") return false;
  return isMemoryWikiEnabled();
}

export function isCursorWikiSyncEnabled() {
  const raw = process.env.AGENTOS_CURSOR_WIKI_SYNC?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function cursorWikiSyncIntervalMs() {
  const parsed = Number(process.env.AGENTOS_CURSOR_WIKI_SYNC_INTERVAL_MS ?? 60_000);
  return Number.isFinite(parsed) && parsed >= 15_000 ? parsed : 60_000;
}

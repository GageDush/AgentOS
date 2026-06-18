/** Comma-separated browser origins allowed for credentialed CORS (e.g. https://flous.dev,http://localhost:3000). */
export function parseCorsOrigins() {
  const raw = process.env.AGENTOS_CORS_ORIGINS?.trim();
  if (!raw) return null;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : null;
}

export function resolveCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow: boolean) => void
) {
  const allowlist = parseCorsOrigins();
  if (!allowlist) {
    callback(null, true);
    return;
  }
  if (!origin) {
    callback(null, true);
    return;
  }
  callback(null, allowlist.includes(origin));
}

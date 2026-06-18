import { URL } from "node:url";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal"
]);

const BLOCKED_SCHEMES = new Set(["file:", "ftp:", "data:", "javascript:"]);

function ipv4ToInt(parts: string[]) {
  return parts.reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateOrReservedIpv4(host: string) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1, 5);
  if (octets.some((o) => Number(o) > 255)) return true;
  const n = ipv4ToInt(octets);
  const inRange = (start: string, end: string) => n >= ipv4ToInt(start.split(".")) && n <= ipv4ToInt(end.split("."));
  return (
    inRange("0.0.0.0", "0.255.255.255") ||
    inRange("10.0.0.0", "10.255.255.255") ||
    inRange("127.0.0.0", "127.255.255.255") ||
    inRange("169.254.0.0", "169.254.255.255") ||
    inRange("172.16.0.0", "172.31.255.255") ||
    inRange("192.168.0.0", "192.168.255.255")
  );
}

function parseAllowlist() {
  const raw = process.env.SCRAPER_ALLOWED_HOSTS?.trim();
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  );
}

export type ScraperUrlDecision = { ok: true; url: URL } | { ok: false; reason: string };

export function validateScraperUrl(rawUrl: string): ScraperUrlDecision {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL." };
  }

  const scheme = parsed.protocol.toLowerCase();
  if (BLOCKED_SCHEMES.has(scheme) || (scheme !== "http:" && scheme !== "https:")) {
    return { ok: false, reason: `Blocked URL scheme: ${scheme}` };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: `Blocked hostname: ${host}` };
  }
  if (host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: `Blocked hostname suffix: ${host}` };
  }
  if (isPrivateOrReservedIpv4(host)) {
    return { ok: false, reason: `Blocked private or reserved IPv4: ${host}` };
  }

  const allowlist = parseAllowlist();
  if (allowlist.size > 0 && !allowlist.has(host)) {
    return { ok: false, reason: `Host not in SCRAPER_ALLOWED_HOSTS: ${host}` };
  }

  return { ok: true, url: parsed };
}

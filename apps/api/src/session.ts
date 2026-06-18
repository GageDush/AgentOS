import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OperatorSession = {
  provider: "discord";
  discordUserId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  operatorId: string;
  issuedAt: string;
};

const SESSION_COOKIE = "agentos_session";
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("SESSION_SECRET is required for OAuth sessions.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function sessionMaxAgeSeconds() {
  const raw = process.env.AGENTOS_SESSION_MAX_AGE_SECONDS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_SESSION_MAX_AGE_SECONDS;
}

export function createSessionToken(session: OperatorSession) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSessionToken(token?: string): OperatorSession | undefined {
  if (!token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OperatorSession;
  } catch {
    return undefined;
  }
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

function cookieDomainAttribute() {
  const explicit = process.env.AGENTOS_COOKIE_DOMAIN?.trim();
  if (explicit) return `; Domain=${explicit}`;
  const apiBase = process.env.AGENTOS_API_BASE_URL?.trim() ?? "";
  if (apiBase.includes("flous.dev")) return "; Domain=.flous.dev";
  return "";
}

function cookieSecureAttribute() {
  const apiBase = process.env.AGENTOS_API_BASE_URL?.trim() ?? "";
  const sameSite = cookieSameSiteAttribute();
  if (sameSite.includes("None") || process.env.AGENTOS_ENV === "production" || apiBase.startsWith("https://")) {
    return "; Secure";
  }
  return "";
}

function cookieSameSiteAttribute() {
  const explicit = process.env.AGENTOS_COOKIE_SAMESITE?.trim().toLowerCase();
  if (explicit === "none" || explicit === "lax" || explicit === "strict") {
    return `; SameSite=${explicit[0].toUpperCase()}${explicit.slice(1)}`;
  }
  if (cookieDomainAttribute()) {
    return "; SameSite=None";
  }
  return "; SameSite=Lax";
}

export function buildSessionCookie(token: string, maxAgeSeconds = sessionMaxAgeSeconds()) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly${cookieSameSiteAttribute()}; Max-Age=${maxAgeSeconds}${cookieSecureAttribute()}${cookieDomainAttribute()}`;
}

export function touchSessionCookie(token: string) {
  return buildSessionCookie(token);
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${cookieSameSiteAttribute()}; Max-Age=0${cookieSecureAttribute()}${cookieDomainAttribute()}`;
}

export function readCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Discord OAuth session operator id when the request carries a valid session cookie. */
export function operatorIdFromRequest(request: { headers: { cookie?: string } }): string | undefined {
  const token = readCookieValue(request.headers.cookie, sessionCookieName());
  return readSessionToken(token)?.operatorId;
}

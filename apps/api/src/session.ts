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
  if (process.env.AGENTOS_ENV === "production" || apiBase.startsWith("https://")) {
    return "; Secure";
  }
  return "";
}

export function buildSessionCookie(token: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${cookieSecureAttribute()}${cookieDomainAttribute()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecureAttribute()}${cookieDomainAttribute()}`;
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

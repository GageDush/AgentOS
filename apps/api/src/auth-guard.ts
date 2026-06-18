import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import { operatorIdFromRequest, readCookieValue, readSessionToken, sessionCookieName } from "./session";

/** When true, routes outside the public allowlist require a valid Discord OAuth session. */
export function isApiAuthRequired() {
  const explicit = process.env.AGENTOS_API_REQUIRE_AUTH?.trim().toLowerCase();
  if (explicit === "true" || explicit === "1" || explicit === "yes") return true;
  if (explicit === "false" || explicit === "0" || explicit === "no") return false;
  return process.env.AGENTOS_ENV?.trim().toLowerCase() === "production";
}

const PUBLIC_EXACT = new Set(["/health"]);

const PUBLIC_PREFIXES = ["/auth/"];

function normalizePath(url: string) {
  const path = url.split("?")[0] ?? url;
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

export function isPublicApiRoute(method: string, url: string) {
  const path = normalizePath(url);
  if (PUBLIC_EXACT.has(path)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (method === "GET" && path.startsWith("/media/agents/")) return true;
  if (path === "/discord/interactions" && method === "POST") return true;
  return false;
}

export function sessionFromRequest(request: FastifyRequest) {
  const token = readCookieValue(request.headers.cookie, sessionCookieName());
  return readSessionToken(token);
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!isApiAuthRequired()) return;
  if (isPublicApiRoute(request.method, request.url)) return;
  const session = sessionFromRequest(request);
  if (!session) {
    return reply.code(401).send({ error: "Authentication required.", code: "auth_required" });
  }
  (request as FastifyRequest & { operatorSession?: typeof session }).operatorSession = session;
}

export function requireAuthWebSocket(request: { headers?: { cookie?: string } }) {
  if (!isApiAuthRequired()) return true;
  const token = readCookieValue(request.headers?.cookie, sessionCookieName());
  return Boolean(readSessionToken(token));
}

export function resolvedOperatorId(request: FastifyRequest, fallback?: string) {
  const fromSession = operatorIdFromRequest(request);
  if (fromSession) return fromSession;
  const attached = (request as FastifyRequest & { operatorSession?: { operatorId: string } }).operatorSession;
  if (attached?.operatorId) return attached.operatorId;
  return fallback ?? "operator-local";
}

function appendPreHandler(routeOptions: RouteOptions, handler: typeof requireAuth) {
  const existing = routeOptions.preHandler;
  if (!existing) {
    routeOptions.preHandler = handler;
    return;
  }
  routeOptions.preHandler = Array.isArray(existing) ? [...existing, handler] : [existing, handler];
}

/** Attach requireAuth to every non-public route when AGENTOS_API_REQUIRE_AUTH is enabled. */
export function installApiAuthGuard(app: FastifyInstance) {
  app.addHook("onRoute", (routeOptions) => {
    if (!isApiAuthRequired()) return;
    const url = routeOptions.url ?? "";
    if (!url.startsWith("/")) return;
    const methods = routeOptions.method ? (Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method]) : ["GET"];
    const allPublic = methods.every((method) => isPublicApiRoute(method, url));
    if (allPublic) return;
    appendPreHandler(routeOptions, requireAuth);
  });
}

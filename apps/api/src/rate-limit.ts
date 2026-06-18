import type { FastifyReply, FastifyRequest } from "fastify";
import { isPublicApiRoute } from "./auth-guard";
import { operatorIdFromRequest } from "./session";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function mutateRateLimitConfig() {
  const max = Number.parseInt(process.env.AGENTOS_MUTATE_RATE_LIMIT_MAX?.trim() ?? "120", 10);
  const windowMs = Number.parseInt(process.env.AGENTOS_MUTATE_RATE_LIMIT_WINDOW_MS?.trim() ?? "60000", 10);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 120,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000
  };
}

function bucketKey(request: FastifyRequest) {
  const operator = operatorIdFromRequest(request);
  if (operator) return `op:${operator}`;
  const forwarded = request.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
    request.ip ??
    "unknown";
  return `ip:${ip}`;
}

export function resetMutateRateLimitBuckets() {
  buckets.clear();
}

export async function mutateRateLimitPreHandler(request: FastifyRequest, reply: FastifyReply) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  if (isPublicApiRoute(method, request.url)) return;

  const { max, windowMs } = mutateRateLimitConfig();
  const key = bucketKey(request);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    reply.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return reply.code(429).send({ error: "Too many mutating requests.", code: "rate_limited" });
  }
}

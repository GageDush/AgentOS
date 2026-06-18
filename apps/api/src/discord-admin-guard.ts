import type { FastifyReply, FastifyRequest } from "fastify";
import { isApiAuthRequired } from "./auth-guard";
import { operatorIdFromRequest } from "./session";

export function isDiscordAdminApiEnabled() {
  const raw = process.env.FEATURE_DISCORD_ADMIN_ROUTES?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export async function requireDiscordAdminApi(request: FastifyRequest, reply: FastifyReply) {
  if (!isDiscordAdminApiEnabled()) {
    return reply.code(403).send({
      error: "Discord admin API routes are disabled. Set FEATURE_DISCORD_ADMIN_ROUTES=true to enable.",
      code: "discord_admin_disabled"
    });
  }
  if (isApiAuthRequired() && !operatorIdFromRequest(request)) {
    return reply.code(401).send({ error: "Authentication required.", code: "auth_required" });
  }
}

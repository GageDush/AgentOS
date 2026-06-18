# Production image for the AgentOS Command Center (Next.js 15).
# Real production build (`next build` + `next start`), unlike the dev Dockerfile.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Baked into the client bundle at build time via next.config.mjs `env`. MUST be the
# PUBLIC API origin (browsers hit this), not an internal docker hostname.
ARG NEXT_PUBLIC_AGENTOS_API_URL=https://api.flous.dev
ENV NEXT_PUBLIC_AGENTOS_API_URL=$NEXT_PUBLIC_AGENTOS_API_URL

COPY . .
RUN corepack enable && pnpm install --frozen-lockfile \
 && pnpm --filter @agentos/command-center build

ENV NODE_ENV=production
# The server-side rewrite target (/agentos-api/* -> API) is read at runtime from
# AGENTOS_API_PROXY_TARGET (set in compose to http://api:8787), so it is NOT baked here.
CMD ["pnpm", "--filter", "@agentos/command-center", "start"]

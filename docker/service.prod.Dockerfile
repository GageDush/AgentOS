# Production image for the AgentOS Node services (api, gateway, worker, scheduler).
# ONE image runs any of them; docker-compose.prod.yml selects the service via `command:`.
# Services run through `tsx` because the repo has no compiled build step
# (each app's `build` is `tsc --noEmit` and there is no `start` script).
#
# Used by docker-compose.prod.yml. The laptop dev stack still uses docker/api.Dockerfile
# et al. via docker-compose.yml — those are left untouched.
FROM node:22-bookworm-slim

# bookworm-slim is glibc, so better-sqlite3 (native, used only by the API) normally
# resolves a prebuilt arm64 binary on Oracle Ampere. The build toolchain is kept as a
# fallback so the first arm64 build can compile from source if no prebuild matches.
# curl backs the compose healthchecks.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skip Chromium download (the API's puppeteer scraper is disabled on the VM initially
# to save memory; re-enable later with a distro chromium + PUPPETEER_EXECUTABLE_PATH).
ENV PUPPETEER_SKIP_DOWNLOAD=true

# NOTE: NODE_ENV is intentionally left unset during install so pnpm keeps
# devDependencies — `tsx` and `typescript` are devDeps and are required at runtime.
# NODE_ENV=production is applied at runtime via docker-compose `environment:`.
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile

# Default command = API. gateway/worker/scheduler override `command:` in compose.
CMD ["pnpm", "--filter", "@agentos/api", "exec", "tsx", "src/index.ts"]

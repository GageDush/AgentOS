#!/usr/bin/env bash
set -euo pipefail

corepack enable || true
corepack prepare pnpm@9.15.4 --activate || true
pnpm install
cp -n .env.example .env || true
pnpm sanitize:check
pnpm env:check

#!/usr/bin/env bash
set -euo pipefail

pnpm db:migrate
pnpm db:seed
pnpm dev

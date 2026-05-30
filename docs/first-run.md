# First Run

```powershell
pnpm install
Copy-Item .env.example .env
pnpm sanitize:check
pnpm env:check
pnpm dev
```

Open:

- http://localhost:3000
- http://localhost:8787/health
- http://localhost:8790/health

If `pnpm` is missing, run `corepack enable` from a terminal with Node installed, then retry.

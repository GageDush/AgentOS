# Troubleshooting

## pnpm is missing

Install or enable pnpm with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Dashboard shows mock API

Start the API:

```powershell
pnpm --filter @agentos/api dev
```

The dashboard intentionally falls back to local mock seed data if the API is offline.

## Phaser canvas is blank

Check that `apps/command-center/public/assets/office-master.png` exists.

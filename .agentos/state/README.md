# `.agentos/state/` — local runtime state

Gitignored working state for the AgentOS stack (SQLite DBs, PID files, the
generated `litellm.config.yaml`, and the command-center **port override**). Do
not commit anything here except this README.

## Command-center UI port

The UI is configured by `.env` → `AGENTOS_COMMAND_CENTER_PORT` (canonical:
**3000**). When the launcher can't bind that port — usually a **zombie Node**
still holding `:3000` after a crash — it escalates and writes the port it
actually used to:

```
.agentos/state/command-center-port.override
```

While that file exists, the override wins: browse the UI on the port inside it,
**not** an assumed `:3000`.

> Current state (2026-06-16): override escalated `3000 → 3002 → 3003` because a
> zombie holds `:3000`. Use `http://localhost:3003/` until cleaned up.

### Inspect

```powershell
pnpm stack:port        # override file, listeners on 3000/3002/3003/8787/8790, cloudflared ingress
Get-Content .agentos/state/command-center-port.override   # raw active port (if present)
```

### Repair / canonicalize back to 3000

```powershell
pnpm stack:repair      # force-stop the launcher tree + restart on the configured port
pnpm stack:port        # confirm a single UI listener on the configured port
```

When the configured port is free again and serving:

1. Delete `command-center-port.override`.
2. Reset the cloudflared UI ingress in `~/.cloudflared/config.yml` back to
   `AGENTOS_COMMAND_CENTER_PORT` (so `flous.dev` points at the canonical port).
3. `pnpm stack:restart`.

### Reboot — last resort

The sandbox / a non-elevated shell **cannot kill an elevated Node process**
holding `:3000`. If `pnpm stack:repair` can't free the port after two tries,
reboot Windows, then `pnpm stack:restart` — it will bind the canonical port and
no override will be written.

## flous.dev public URL

A `530` from `flous.dev` means the cloudflared tunnel isn't running (localhost
still works). Repair with `pnpm tunnel:repair` or
`agentos-control.ps1 -Action StartWithTunnel`. The tunnel ingress port must match
the active UI port above.

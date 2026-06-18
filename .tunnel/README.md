# .tunnel — AgentOS tunnel health state

Shared state between the Claude scheduled task `agentos-tunnel-health` (detects
outages) and the Windows watchdog `scripts/tunnel-watchdog.ps1` (repairs them).

## Files

| File | Written by | Meaning |
|------|------------|---------|
| `MAINTENANCE` | You (or `tunnel-maintenance.ps1`) | Tunnel is **intentionally** down. While present, the scheduled task reports maintenance instead of alarming, and the watchdog will NOT repair. Optional first line = ISO-8601 expiry; after that time the flag is ignored. |
| `repair-request.json` | Claude scheduled task | An outage was detected. Asks the watchdog to repair. Contains `{ requestedAt, down: [...], note }`. |
| `last-repair.txt` | Watchdog | ISO-8601 timestamp of the last repair attempt. Used to debounce (cooldown). |
| `watchdog.log` | Watchdog | Append-only log of every watchdog run, repair, and recovery. |
| `repair-history.log` | Watchdog | Archive of handled `repair-request.json` payloads. |

## How it fits together

1. `agentos-tunnel-health` runs hourly. It fetches `https://api.flous.dev/health`
   and `https://flous.dev`.
2. If a `MAINTENANCE` flag is present (and not expired) it reports
   `MAINTENANCE MODE` and does nothing else.
3. Otherwise, on a real outage it writes `repair-request.json` and reports the outage.
4. The watchdog (a Windows Scheduled Task running every minute, as SYSTEM with
   highest privileges) sees the request, re-checks the endpoints itself, and if
   they are still down and the cooldown has elapsed, runs
   `scripts/repair-cloudflare-tunnel.ps1`. Results go to `watchdog.log`.

## Toggling maintenance

```powershell
# turn ON (indefinite)
pwsh -File scripts/tunnel-maintenance.ps1 -On
# turn ON for 90 minutes (auto-expires)
pwsh -File scripts/tunnel-maintenance.ps1 -On -Minutes 90
# turn OFF
pwsh -File scripts/tunnel-maintenance.ps1 -Off
# status
pwsh -File scripts/tunnel-maintenance.ps1 -Status
```

## Installing / removing the watchdog

```powershell
# install (run from an elevated/admin PowerShell)
pwsh -File scripts/install-tunnel-watchdog.ps1
# remove
pwsh -File scripts/install-tunnel-watchdog.ps1 -Uninstall
```

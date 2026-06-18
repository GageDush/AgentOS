---
slug: docs/design/trusted-device-auth-wireframe
title: Trusted Device Auth Wireframe
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Trusted Device Auth Wireframe

Source: `docs/design/trusted-device-auth-wireframe.md` (excerpt; secrets redacted).

## Excerpt

# Trusted Device Auth Wireframe

## Purpose

AgentOS needs a hosted login flow that remembers trusted operator devices without leaving the Command Center broadly exposed. The flow keeps Discord OAuth as identity proof, then issues a revocable server-side device credential for the browser.

This is a static planning wireframe for the Command Center and API auth work.

## Product Shape

- Outer wall: Cloudflare Access, Tailscale, or equivalent network gate before AgentOS is publicly reachable.
- Identity: Discord OAuth remains the operator login provider.
- Device trust: AgentOS issues an opaque `agentos_device` credential after login and stores only a hash server-side.
- Session: short-lived `agentos_session` access cookie refreshed from a valid trusted device.
- Step-up: approvals, tool execution, secrets, deploys, and release gates require a fresh trusted-device check.
- Revocation: operators can list, rename, expire, and revoke devices.

## Screen 1: Signed-Out Gate

[code block omitted]

Expected behavior:

- `/auth/me` returns `401` with `authenticated: false`.
- CTA links to `/auth/discord`.
- If the API is unreachable, show the existing local/offline state instead of a blank login card.

## Screen 2: First Login Device Prompt

[code block omitted]

Expected behavior:

- Discord OAuth creates an operator identity session.
- Choosing `Trust device` creates a server-side device record and an opaque cookie.
- Choosing `Continue once` creates only the short access session.
- Device label defaults from user agent, but remains editable.

## Screen 3: Command Center Signed-In Header

[code block omitted]

Expected behavior:

- Auth state is visible but compact.
- Operator actions use the authenticated `operatorId`.
- If the device is not trusted, sensitive actions show the step-up prompt.

## Screen 4: Step-Up Prompt

[code block omitted]

Expected behavior:

- The approval remains pending until step-up succeeds.
- Passkey is the preferred future path; Discord re-auth is acceptable for the first implementation.
- Success writes an audit event with `operatorId`, `deviceId`, action id, and time.

## Screen 5: Trusted Devices Panel

[code block omitted]

Expected behavior:

- Device records are operator-scoped.
- Revocation clears refresh capability immediately.
- The current device is visually marked so the operator does not revoke it by accident.

## Screen 6:

## Related

- [[index]]
- [[areas/repo-layout]]

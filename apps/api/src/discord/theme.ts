export const AGENTOS_EMBED_THEME = {
  neonCyan: 0x00f5ff,
  neonViolet: 0x9b59ff,
  neonMagenta: 0xff2d95,
  neonAmber: 0xffb020,
  matrixGreen: 0x00ff9f,
  alertRed: 0xff3b5c,
  voidBlack: 0x0b0f1a,
  agentColors: {
    "admin-agent": 0xf1c40f,
    "builder-agent": 0x3498db,
    "qa-agent": 0x2ecc71,
    "security-auditor": 0xe74c3c,
    "release-manager": 0x8e44ad,
    default: 0x00f5ff
  } as Record<string, number>
} as const;

export const SEEN_EMOJI = "👁️";
export const AWAITING_EMOJI = "◌";
export const SIGNAL_PREFIX = "◈";
export const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━";

import { personaDiscordName, resolvePersona } from "./personas";

export function agentAccentColor(agentId?: string) {
  if (!agentId) return AGENTOS_EMBED_THEME.neonCyan;
  return resolvePersona(agentId).color;
}

export function agentDisplayName(agentId?: string, fallback?: string) {
  if (!agentId && fallback) return fallback;
  return personaDiscordName(resolvePersona(agentId));
}

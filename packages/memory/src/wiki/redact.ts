const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[a-zA-Z0-9_-]{8,}/g, "[REDACTED_OPENAI_KEY]"],
  [/gho_[a-zA-Z0-9]+/g, "[REDACTED_GH_TOKEN]"],
  [/ghp_[a-zA-Z0-9]+/g, "[REDACTED_GH_TOKEN]"],
  [/github_pat_[a-zA-Z0-9_]+/gi, "[REDACTED_GH_TOKEN]"],
  [/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]"],
  [/postgresql:\/\/[^\s"'`]+/gi, "postgresql://[REDACTED]"],
  [/redis:\/\/[^\s"'`]+/gi, "redis://[REDACTED]"],
  [/CURSOR_API_KEY=[^\s]+/gi, "CURSOR_API_KEY=[REDACTED]"],
  [/SESSION_SECRET=[^\s]+/gi, "SESSION_SECRET=[REDACTED]"],
  [/DISCORD_CLIENT_SECRET=[^\s]+/gi, "DISCORD_CLIENT_SECRET=[REDACTED]"],
  [/OPENAI_API_KEY=[^\s]+/gi, "OPENAI_API_KEY=[REDACTED]"],
  [/AUTH_CLIENT_SECRET=[^\s]+/gi, "AUTH_CLIENT_SECRET=[REDACTED]"],
  [/GH_TOKEN=[^\s]+/gi, "GH_TOKEN=[REDACTED]"]
];

export function redactSecrets(text: string) {
  let next = text;
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

export function stripUserQueryTags(text: string) {
  return text.replace(/<user_query>\s*/gi, "").replace(/<\/user_query>/gi, "").trim();
}

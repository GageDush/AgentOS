import type { OperatorSession } from "./session";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function localOAuthRedirectUri() {
  return (
    process.env.DISCORD_OAUTH_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${process.env.AGENTOS_API_PORT ?? 8787}/auth/discord/callback`
  );
}

function productionOAuthRedirectUri() {
  const explicit = process.env.DISCORD_OAUTH_REDIRECT_URI_PROD?.trim();
  if (explicit) return explicit;
  const apiBase = process.env.AGENTOS_API_BASE_URL?.trim();
  if (!apiBase) return undefined;
  return `${apiBase.replace(/\/$/, "")}/auth/discord/callback`;
}

function hostFromRequest(requestHost?: string) {
  return requestHost?.split(":")[0]?.toLowerCase() ?? "";
}

export function getDiscordOAuthRedirectUri(requestHost?: string) {
  const local = localOAuthRedirectUri();
  const prod = productionOAuthRedirectUri();
  const host = hostFromRequest(requestHost);
  if (!host || host === "127.0.0.1" || host === "localhost") {
    return local;
  }
  if (prod) {
    try {
      const prodHost = new URL(prod).hostname.toLowerCase();
      if (host === prodHost || host.endsWith(".flous.dev")) {
        return prod;
      }
    } catch {
      return prod;
    }
  }
  return local;
}

function apiBaseUrl() {
  const port = process.env.AGENTOS_API_PORT ?? 8787;
  return process.env.AGENTOS_API_BASE_URL?.trim() || `http://127.0.0.1:${port}`;
}

export function getDiscordOAuthSuccessRedirect() {
  return process.env.AGENTOS_OAUTH_SUCCESS_REDIRECT?.trim() || `${apiBaseUrl()}/auth/success`;
}

export function isDiscordOAuthConfigured() {
  return Boolean(process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim() && process.env.SESSION_SECRET?.trim());
}

export function buildDiscordAuthorizeUrl(state: string, requestHost?: string) {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() || process.env.DISCORD_APPLICATION_ID?.trim();
  if (!clientId) {
    throw new Error("DISCORD_CLIENT_ID or DISCORD_APPLICATION_ID is required.");
  }
  const scope = process.env.DISCORD_OAUTH_SCOPES?.trim() || "identify";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getDiscordOAuthRedirectUri(requestHost),
    response_type: "code",
    scope,
    state
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordOAuthCode(code: string, requestHost?: string) {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() || process.env.DISCORD_APPLICATION_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Discord OAuth client credentials are not configured.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: getDiscordOAuthRedirectUri(requestHost)
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as DiscordTokenResponse;
}

export async function fetchDiscordUser(accessToken: string) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Discord user lookup failed with HTTP ${response.status}.`);
  }
  return (await response.json()) as DiscordUser;
}

export async function createDiscordOperatorSession(code: string, requestHost?: string): Promise<OperatorSession> {
  const token = await exchangeDiscordOAuthCode(code, requestHost);
  const user = await fetchDiscordUser(token.access_token);
  return {
    provider: "discord",
    discordUserId: user.id,
    username: user.username,
    globalName: user.global_name ?? undefined,
    avatar: user.avatar ?? undefined,
    operatorId: `discord-${user.id}`,
    issuedAt: new Date().toISOString()
  };
}

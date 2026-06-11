export const apiBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://localhost:8787";

export type OperatorAuthSession = {
  provider: "discord";
  discordUserId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  operatorId: string;
  issuedAt: string;
};

export type AuthMeResponse =
  | { authenticated: false }
  | { authenticated: true; session: OperatorAuthSession };

const jsonHeaders = { Accept: "application/json" } as const;

export async function fetchAuthSession(): Promise<AuthMeResponse> {
  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      cache: "no-store",
      credentials: "include",
      headers: jsonHeaders
    });
    if (!response.ok) return { authenticated: false };
    return (await response.json()) as AuthMeResponse;
  } catch {
    return { authenticated: false };
  }
}

export function discordLoginUrl() {
  return `${apiBase}/auth/discord`;
}

export async function logoutOperator() {
  await fetch(`${apiBase}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBase}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers: jsonHeaders
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...jsonHeaders },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({ error: "Request failed." }))) as T | { error?: string; message?: string };
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload
        ? "error" in payload && payload.error
          ? payload.error
          : "message" in payload && payload.message
            ? payload.message
            : `Request failed with HTTP ${response.status}.`
        : `Request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

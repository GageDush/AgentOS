const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://localhost:8787";

function browserApiBase() {
  return "/agentos-api";
}

export function resolveApiBase() {
  if (typeof window !== "undefined") {
    return browserApiBase();
  }
  return PUBLIC_API_BASE;
}

export const apiBase = resolveApiBase();

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
    const response = await fetch(`${resolveApiBase()}/auth/me`, {
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
  return `${resolveApiBase()}/auth/discord`;
}

export async function logoutOperator() {
  await fetch(`${resolveApiBase()}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}

export type ApiFetchResult<T> = { ok: true; data: T } | { ok: false; status?: number };

export async function apiGetResult<T>(path: string): Promise<ApiFetchResult<T>> {
  try {
    const response = await fetch(`${resolveApiBase()}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers: jsonHeaders
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false };
  }
}

export async function fetchApiHealth(): Promise<boolean> {
  const result = await apiGetResult<{ ok?: boolean }>("/health");
  return result.ok && Boolean(result.data.ok);
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  const result = await apiGetResult<T>(path);
  return result.ok ? result.data : fallback;
}

export async function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${resolveApiBase()}${path}`, {
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

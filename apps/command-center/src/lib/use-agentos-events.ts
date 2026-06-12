"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveApiBase } from "./agentos-api";

export type AgentOSConnectionMode = "live" | "polling" | "offline";

export type AgentOSSnapshotEvent = {
  event: "agentos.snapshot" | "system.health.changed";
  data: unknown;
};

function eventsUrl() {
  const base = resolveApiBase();
  if (base.startsWith("http")) {
    return base.replace(/^http/, "ws") + "/events";
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/agentos-api/events`;
  }
  return "ws://127.0.0.1:8787/events";
}

export function useAgentOSEvents(options?: { pollFallbackMs?: number; enabled?: boolean }) {
  const pollMs = options?.pollFallbackMs ?? 5000;
  const enabled = options?.enabled !== false;
  const [mode, setMode] = useState<AgentOSConnectionMode>("offline");
  const [lastSnapshot, setLastSnapshot] = useState<unknown>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);

  const handleMessage = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as AgentOSSnapshotEvent;
      setLastEventAt(new Date().toISOString());
      if (parsed.event === "agentos.snapshot") {
        setLastSnapshot(parsed.data);
      }
    } catch {
      /* ignore malformed */
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const startPolling = () => {
      setMode("polling");
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${resolveApiBase()}/dashboard`, { cache: "no-store", credentials: "include" });
          if (!res.ok) {
            setMode("offline");
            return;
          }
          const data = await res.json();
          setLastSnapshot(data);
          setLastEventAt(new Date().toISOString());
        } catch {
          setMode("offline");
        }
      }, pollMs);
    };

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(eventsUrl());
        wsRef.current = ws;
        ws.onopen = () => {
          reconnectRef.current = 0;
          setMode("live");
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = undefined;
          }
        };
        ws.onmessage = (ev) => handleMessage(String(ev.data));
        ws.onerror = () => startPolling();
        ws.onclose = () => {
          wsRef.current = null;
          if (cancelled) return;
          reconnectRef.current += 1;
          const delay = Math.min(30_000, 1000 * 2 ** reconnectRef.current);
          if (reconnectRef.current > 2) startPolling();
          window.setTimeout(connect, delay);
        };
      } catch {
        startPolling();
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, handleMessage, pollMs]);

  return { mode, lastSnapshot, lastEventAt };
}

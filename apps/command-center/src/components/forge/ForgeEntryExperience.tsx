"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ForgeBootLoader } from "./ForgeBootLoader";
import { ForgeLandingZone } from "./ForgeLandingZone";
import { ForgeLaunchTransition } from "./ForgeLaunchTransition";
import "./forge-entry.css";

const ENTRY_STORAGE_KEY = "agentos-forge-entered";
const BOOT_MIN_MS = 2400;
const LAUNCH_MS = 900;

type EntryPhase = "boot" | "landing" | "launch" | "done";

type ForgeEntryExperienceProps = {
  children: ReactNode;
};

function shouldSkipEntry(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ENTRY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function ForgeEntryExperience({ children }: ForgeEntryExperienceProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<EntryPhase>("boot");
  const [bootReady, setBootReady] = useState(false);
  const [prefetch, setPrefetch] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (shouldSkipEntry()) {
      setPhase("done");
      setBootReady(true);
      setPrefetch(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || phase === "done") return;

    let cancelled = false;
    const startedAt = Date.now();

    const finishBoot = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, BOOT_MIN_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) {
          setBootReady(true);
          setPrefetch(true);
        }
      }, wait);
    };

    if (document.readyState === "complete") {
      finishBoot();
    } else {
      window.addEventListener("load", finishBoot, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", finishBoot);
    };
  }, [mounted, phase]);

  useEffect(() => {
    if (bootReady && phase === "boot") {
      const timer = window.setTimeout(() => setPhase("landing"), 320);
      return () => window.clearTimeout(timer);
    }
  }, [bootReady, phase]);

  const handleLaunch = useCallback(() => {
    setPhase("launch");
    try {
      sessionStorage.setItem(ENTRY_STORAGE_KEY, "1");
    } catch {
      // ignore storage failures
    }
    window.setTimeout(() => setPhase("done"), LAUNCH_MS);
  }, []);

  if (!mounted) {
    return <ForgeBootLoader />;
  }

  return (
    <>
      {prefetch && phase !== "done" ? <div className="forge-entry-hidden-prefetch">{children}</div> : null}

      {phase === "boot" ? <ForgeBootLoader /> : null}
      {phase === "landing" ? <ForgeLandingZone onLaunch={handleLaunch} /> : null}
      {phase === "launch" ? (
        <>
          <ForgeLandingZone onLaunch={handleLaunch} launching />
          <ForgeLaunchTransition />
        </>
      ) : null}

      {phase === "done" ? <div className="forge-entry-dashboard-wrap">{children}</div> : null}
    </>
  );
}

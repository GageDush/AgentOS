"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COMMAND_TEXT = "Run Everything";

type ForgeLandingZoneProps = {
  onLaunch: () => void;
  launching?: boolean;
};

export function ForgeLandingZone({ onLaunch, launching = false }: ForgeLandingZoneProps) {
  const [typed, setTyped] = useState("");
  const promptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (launching) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setTyped(COMMAND_TEXT);
      return;
    }

    let frame = 0;
    const framesPerChar = 4;
    const pauseFrames = 18;
    const framesPerDelete = 2;
    const forwardFrames = COMMAND_TEXT.length * framesPerChar;
    const backwardFrames = COMMAND_TEXT.length * framesPerDelete;
    const cycleLength = forwardFrames + pauseFrames + backwardFrames;

    const interval = window.setInterval(() => {
      frame = (frame + 1) % cycleLength;

      if (frame < forwardFrames) {
        const length = Math.min(COMMAND_TEXT.length, Math.ceil(frame / framesPerChar));
        setTyped(COMMAND_TEXT.slice(0, length));
        return;
      }

      if (frame < forwardFrames + pauseFrames) {
        setTyped(COMMAND_TEXT);
        return;
      }

      const backFrame = frame - forwardFrames - pauseFrames;
      const length = Math.max(0, COMMAND_TEXT.length - Math.floor(backFrame / framesPerDelete));
      setTyped(COMMAND_TEXT.slice(0, length));
    }, 70);

    return () => window.clearInterval(interval);
  }, [launching]);

  const launch = useCallback(() => {
    if (launching) return;
    setTyped(COMMAND_TEXT);
    onLaunch();
  }, [launching, onLaunch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        launch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [launch]);

  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  return (
    <div className="forge-entry-layer">
      <div className="forge-entry-orbit forge-entry-orbit-a" aria-hidden="true" />
      <div className="forge-entry-orbit forge-entry-orbit-b" aria-hidden="true" />
      <div className="forge-entry-inner">
        <p className="forge-entry-kicker">Welcome to the command surface</p>
        <h1 className="forge-entry-title">
          Your agents are <span className="forge-entry-title-accent">ready</span>
        </h1>
        <p className="forge-entry-copy">
          AgentOS Forge is a local-first mission console for dispatching work, approving sandbox actions, and
          watching agents execute in real time.
        </p>

        <button
          ref={promptRef}
          type="button"
          className={`forge-entry-prompt-wrap ${launching ? "forge-entry-prompt-wrap-launching" : ""}`.trim()}
          onClick={launch}
          aria-label="Run Everything to open the dashboard"
        >
          <div className="forge-entry-prompt-line">
            <span className="forge-entry-prompt-prefix">&gt;</span>
            <span className="forge-entry-prompt-text">{typed || "\u00A0"}</span>
            {!launching ? <span className="forge-entry-cursor" aria-hidden="true" /> : null}
          </div>
          <p className="forge-entry-hint">Press Enter or click to enter mission control</p>
        </button>
      </div>
    </div>
  );
}

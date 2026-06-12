"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForgeCommandItem } from "../adapters/types";

type CommandPaletteProps = {
  commands: ForgeCommandItem[];
  onExecute?: (command: ForgeCommandItem) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CommandPalette({ commands, onExecute, open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, [setOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        onExecute?.(filtered[activeIndex]);
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onExecute, close, setOpen]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        background: "rgba(0,0,0,0.55)"
      }}
      onClick={close}
    >
      <div
        className="forge-panel"
        style={{ width: "min(640px, 92vw)", padding: "0.75rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="forge-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="Search commands, /slash, @agents…"
          aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}
        />
        <ul
          role="listbox"
          style={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0, maxHeight: 320, overflow: "auto" }}
        >
          {filtered.length === 0 ? (
            <li style={{ padding: "0.65rem", color: "var(--forge-muted)" }}>No matching commands.</li>
          ) : (
            filtered.map((cmd, index) => (
              <li
                key={cmd.id}
                id={`cmd-${cmd.id}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onExecute?.(cmd);
                  close();
                }}
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: index === activeIndex ? "var(--forge-accent-dim)" : "transparent",
                  border: index === activeIndex ? "1px solid var(--forge-border-strong)" : "1px solid transparent"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.85rem" }}>{cmd.label}</strong>
                  <span className="forge-mono" style={{ fontSize: "0.6rem", color: "var(--forge-muted)" }}>
                    {cmd.category}
                  </span>
                </div>
                {cmd.description ? (
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--forge-muted)" }}>{cmd.description}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
        <p className="forge-mono" style={{ margin: "0.5rem 0 0", fontSize: "0.6rem", color: "var(--forge-soft)" }}>
          ↑↓ navigate · Enter run · Esc close · ⌘K / Ctrl+K
        </p>
      </div>
    </div>
  );
}

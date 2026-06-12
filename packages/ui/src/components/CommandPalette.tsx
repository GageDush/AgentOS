"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForgeCommandItem } from "../adapters/types";

type CommandPaletteProps = {
  commands: ForgeCommandItem[];
  onExecute?: (command: ForgeCommandItem) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const CATEGORY_ORDER: ForgeCommandItem["category"][] = ["recent", "suggested", "slash", "agent", "integration"];
const CATEGORY_LABELS: Record<ForgeCommandItem["category"], string> = {
  recent: "Recent",
  suggested: "Suggested",
  slash: "Slash Commands",
  agent: "Agents",
  integration: "Integrations"
};

export function CommandPalette({ commands, onExecute, open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);
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

  const grouped = useMemo(() => {
    if (query.trim()) {
      return [{ category: "results" as const, items: filtered }];
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filtered.filter((cmd) => cmd.category === category)
    })).filter((group) => group.items.length > 0);
  }, [filtered, query]);

  const flatItems = useMemo(
    () => grouped.flatMap((group) => group.items),
    [grouped]
  );

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
      setRendered(false);
      setClosing(false);
    }, 160);
  }, [closing, setOpen]);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (!rendered || closing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (event.key === "Enter" && flatItems[activeIndex]) {
        event.preventDefault();
        onExecute?.(flatItems[activeIndex]);
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rendered, closing, flatItems, activeIndex, onExecute, close, setOpen]);

  useEffect(() => {
    if (rendered && !closing) {
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [rendered, closing]);

  if (!rendered) return null;

  let runningIndex = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className={`forge-palette-backdrop ${closing ? "forge-palette-backdrop-closing" : ""}`.trim()}
      onClick={close}
    >
      <div
        className={`forge-panel forge-palette-panel ${closing ? "forge-palette-panel-closing" : ""}`.trim()}
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
          aria-activedescendant={flatItems[activeIndex] ? `cmd-${flatItems[activeIndex].id}` : undefined}
        />

        {flatItems.length === 0 ? (
          <p className="forge-palette-empty">
            {query.trim() ? `No commands match “${query.trim()}”.` : "No commands available yet."}
          </p>
        ) : (
          grouped.map((group) => {
            const groupStart = runningIndex;
            const section = (
              <div key={group.category} className="forge-palette-group">
                <p className="forge-palette-group-label">
                  {group.category === "results" ? "Results" : CATEGORY_LABELS[group.category]}
                </p>
                <ul role="listbox" className="forge-palette-list">
                  {group.items.map((cmd, indexInGroup) => {
                    const index = groupStart + indexInGroup;
                    return (
                      <li
                        key={cmd.id}
                        id={`cmd-${cmd.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={`forge-palette-item ${index === activeIndex ? "forge-palette-item-active" : ""}`.trim()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          onExecute?.(cmd);
                          close();
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
                    );
                  })}
                </ul>
              </div>
            );
            runningIndex += group.items.length;
            return section;
          })
        )}

        <p className="forge-mono" style={{ margin: "0.5rem 0 0", fontSize: "0.6rem", color: "var(--forge-soft)" }}>
          ↑↓ navigate · Enter run · Esc close · ⌘K / Ctrl+K
        </p>
      </div>
    </div>
  );
}

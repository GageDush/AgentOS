"use client";

import { useState, type ReactNode } from "react";
import type { GeneratedAppViewport, InspectSelection } from "../adapters/types";
import { CommandInput } from "./CommandInput";
import { MagneticButton } from "../motion/MagneticButton";
import { TerminalWindow } from "./TerminalWindow";

type GeneratedAppFrameProps = {
  title?: string;
  previewUrl?: string;
  previewContent?: ReactNode;
  initialViewport?: GeneratedAppViewport;
  onInspectSubmit?: (selection: InspectSelection) => void;
};

/**
 * INTEGRATION TODO: Wire inspect mode to DOM path capture, screenshot crop,
 * surrounding code lookup, and agent modification requests.
 */
export function GeneratedAppFrame({
  title = "Generated App Preview",
  previewUrl = "about:blank",
  previewContent,
  initialViewport = "desktop",
  onInspectSubmit
}: GeneratedAppFrameProps) {
  const [viewport, setViewport] = useState<GeneratedAppViewport>(initialViewport);
  const [inspectMode, setInspectMode] = useState(false);
  const [selection, setSelection] = useState<InspectSelection | null>(null);

  const viewportWidth =
    viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "390px";

  const handleMockSelect = () => {
    if (!inspectMode) return;
    // INTEGRATION TODO: Replace mock selection with real click-to-edit capture.
    const mock: InspectSelection = {
      componentLabel: "HeroCTA",
      domPath: "main > section.hero > button.cta-primary",
      surroundingCode: "// packages/ui/src/components/...",
      userInstruction: ""
    };
    setSelection(mock);
  };

  return (
    <TerminalWindow
      title={title}
      subtitle="Responsive preview with inspect mode foundation"
      actions={
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {(["desktop", "tablet", "mobile"] as GeneratedAppViewport[]).map((v) => (
            <MagneticButton key={v} variant={viewport === v ? "primary" : "default"} onClick={() => setViewport(v)}>
              {v}
            </MagneticButton>
          ))}
          <MagneticButton onClick={() => window.open(previewUrl, "_blank")}>Open in Browser</MagneticButton>
          <MagneticButton onClick={() => alert("Screenshot capture — INTEGRATION TODO")}>Screenshot</MagneticButton>
          <MagneticButton variant={inspectMode ? "primary" : "default"} onClick={() => setInspectMode((v) => !v)}>
            Inspect
          </MagneticButton>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div
          style={{
            margin: "0 auto",
            width: viewportWidth,
            maxWidth: "100%",
            border: "1px solid var(--forge-border)",
            borderRadius: 8,
            overflow: "hidden",
            background: "rgba(0,0,0,0.4)",
            minHeight: 200
          }}
        >
          <div
            style={{
              padding: "0.35rem 0.65rem",
              borderBottom: "1px solid var(--forge-border)",
              display: "flex",
              gap: "0.35rem",
              alignItems: "center"
            }}
          >
            <span className="forge-chip">Preview</span>
            {inspectMode ? <span className="forge-chip forge-chip-active">Inspect Mode</span> : null}
          </div>
          <div
            role={inspectMode ? "button" : undefined}
            tabIndex={inspectMode ? 0 : undefined}
            onClick={handleMockSelect}
            onKeyDown={(e) => {
              if (inspectMode && (e.key === "Enter" || e.key === " ")) handleMockSelect();
            }}
            style={{ padding: "1rem", cursor: inspectMode ? "crosshair" : "default", minHeight: 160 }}
          >
            {previewContent ?? (
              <p style={{ color: "var(--forge-muted)", margin: 0, fontSize: "0.82rem" }}>
                {inspectMode
                  ? "Click an element to select it for agent modification (mock selection)."
                  : "Generated app preview surface — connect a live preview URL when available."}
              </p>
            )}
          </div>
        </div>

        {selection ? (
          <div className="forge-panel" style={{ padding: "0.75rem" }}>
            <p className="forge-mono" style={{ margin: "0 0 0.35rem", color: "var(--forge-accent)", fontSize: "0.68rem" }}>
              Selected: {selection.componentLabel}
            </p>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "var(--forge-muted)", fontFamily: "var(--forge-mono)" }}>
              {selection.domPath}
            </p>
            <CommandInput
              placeholder="Ask agent to modify selected element…"
              onSubmit={(instruction) => {
                const payload = { ...selection, userInstruction: instruction };
                onInspectSubmit?.(payload);
              }}
            />
          </div>
        ) : null}
      </div>
    </TerminalWindow>
  );
}

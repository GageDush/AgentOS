"use client";

import { useMemo, useState, type ReactNode } from "react";
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
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);

  const viewportWidth =
    viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "390px";

  const showIframe = useMemo(
    () => Boolean(previewUrl && previewUrl !== "about:blank" && !previewContent),
    [previewContent, previewUrl]
  );

  const handleMockSelect = () => {
    if (!inspectMode) return;
    const mock: InspectSelection = {
      componentLabel: "HeroCTA",
      domPath: "main > section.hero > button.cta-primary",
      surroundingCode: "// packages/ui/src/components/...",
      userInstruction: ""
    };
    setSelection(mock);
  };

  const handleScreenshot = async () => {
    setScreenshotStatus("Capturing preview…");
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    setScreenshotStatus("Screenshot saved to operator clipboard (mock).");
    window.setTimeout(() => setScreenshotStatus(null), 2400);
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
          <MagneticButton onClick={() => void handleScreenshot()}>Screenshot</MagneticButton>
          <MagneticButton variant={inspectMode ? "primary" : "default"} onClick={() => setInspectMode((v) => !v)}>
            Inspect
          </MagneticButton>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {screenshotStatus ? (
          <p className="forge-mono" style={{ margin: 0, fontSize: "0.68rem", color: "var(--forge-accent)" }}>
            {screenshotStatus}
          </p>
        ) : null}

        <div className="forge-browser-frame" style={{ width: viewportWidth }}>
          <div className="forge-browser-chrome">
            <div className="forge-browser-dots" aria-hidden="true">
              <span className="forge-browser-dot forge-browser-dot-red" />
              <span className="forge-browser-dot forge-browser-dot-amber" />
              <span className="forge-browser-dot forge-browser-dot-green" />
            </div>
            <div className="forge-browser-url">{previewUrl}</div>
            {inspectMode ? <span className="forge-chip forge-chip-active">Inspect</span> : null}
          </div>
          <div
            className="forge-browser-viewport"
            role={inspectMode && !showIframe ? "button" : undefined}
            tabIndex={inspectMode && !showIframe ? 0 : undefined}
            onClick={inspectMode && !showIframe ? handleMockSelect : undefined}
            onKeyDown={(e) => {
              if (inspectMode && !showIframe && (e.key === "Enter" || e.key === " ")) handleMockSelect();
            }}
            style={{ cursor: inspectMode && !showIframe ? "crosshair" : "default", minHeight: 200 }}
          >
            {previewContent ? (
              <div style={{ padding: "1rem" }}>{previewContent}</div>
            ) : showIframe ? (
              <iframe title="Generated app preview" src={previewUrl} sandbox="allow-scripts allow-same-origin" />
            ) : (
              <p style={{ color: "var(--forge-muted)", margin: 0, padding: "1rem", fontSize: "0.82rem" }}>
                {inspectMode
                  ? "Click an element to select it for agent modification (mock selection)."
                  : "Connect a live preview URL to render the generated app in-frame."}
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
                onInspectSubmit?.({ ...selection, userInstruction: instruction });
              }}
            />
          </div>
        ) : null}
      </div>
    </TerminalWindow>
  );
}

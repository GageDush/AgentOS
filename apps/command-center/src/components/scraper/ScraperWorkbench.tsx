"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppShell,
  ForgeSectionHeader,
  ForgeSegmentedControl,
  ForgeStatCard,
  MagneticButton,
  TerminalWindow,
  TopNav
} from "@agentos/ui";
import {
  EXPORT_LABELS,
  PHASE_LABELS,
  getScrapeGallery,
  getScrapeGalleryIndex,
  getScrapeLogs,
  getScrapeStatus,
  scrapeExportUrl,
  scrapeFileUrl,
  startScrape,
  stopScrape,
  type ScraperExportFormat,
  type ScraperGalleryIndexEntry,
  type ScraperGalleryItem,
  type ScraperGalleryRecord,
  type ScraperLogEntry,
  type ScraperPhase,
  type ScraperStatus
} from "../../lib/scraper-api";

const PHASE_ORDER: ScraperPhase[] = ["crawling", "rendering", "assets", "observing", "packaging", "done"];
const ALL_EXPORTS: ScraperExportFormat[] = ["zip", "json", "csv"];

type FormState = {
  url: string;
  downloadType: "full" | "single";
  exportFormats: ScraperExportFormat[];
  maxPages: number;
  maxDepth: number;
};

const defaultForm: FormState = {
  url: "",
  downloadType: "single",
  exportFormats: ["zip", "json"],
  maxPages: 20,
  maxDepth: 2
};

function phaseIndex(phase: ScraperPhase) {
  if (phase === "done" || phase === "stopped") return 5;
  if (phase === "packaging") return 4;
  if (phase === "observing") return 3;
  if (phase === "assets") return 2;
  if (phase === "rendering") return 1;
  if (phase === "crawling") return 0;
  return -1;
}

function confidenceTone(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return "var(--forge-green)";
  if (confidence === "medium") return "#f5c842";
  return "var(--forge-red)";
}

function ProgressBar({
  value,
  label,
  active,
  complete
}: {
  value: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  const color = complete ? "var(--forge-green)" : active ? "var(--forge-accent)" : "var(--forge-soft)";
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "var(--forge-text-sm)", color: active || complete ? "var(--forge-text)" : "var(--forge-muted)" }}>
          {label}
        </span>
        <span style={{ fontSize: "var(--forge-text-xs)", color: "var(--forge-muted)" }}>{Math.round(value)}%</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          border: "1px solid var(--forge-border)"
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, var(--forge-violet))`,
            transition: "width 0.45s ease",
            boxShadow: active ? `0 0 12px rgba(var(--forge-accent-rgb), 0.45)` : "none"
          }}
        />
      </div>
    </div>
  );
}

function chipStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.22rem 0.55rem",
    borderRadius: 999,
    border: "1px solid var(--forge-border)",
    background: "rgba(255,255,255,0.04)",
    fontSize: "var(--forge-text-xs)",
    color: "var(--forge-muted)"
  } as const;
}

function MediaTile({
  item,
  downloadId
}: {
  item: ScraperGalleryItem;
  downloadId: string;
}) {
  const preview = item.previewPath ? scrapeFileUrl(downloadId, item.previewPath) : null;
  const detailHref = item.localPath ? scrapeFileUrl(downloadId, item.localPath) : item.sourceUrl;

  return (
    <article
      className="forge-panel"
      style={{
        padding: "0.9rem",
        display: "grid",
        gap: "0.75rem",
        alignContent: "start",
        minHeight: 220
      }}
    >
      {preview ? (
        <div
          style={{
            aspectRatio: "16 / 10",
            overflow: "hidden",
            borderRadius: 8,
            border: "1px solid var(--forge-border)",
            background: "rgba(255,255,255,0.03)"
          }}
        >
          <img
            src={preview}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : (
        <div
          style={{
            aspectRatio: "16 / 10",
            borderRadius: 8,
            border: "1px dashed var(--forge-border)",
            display: "grid",
            placeItems: "center",
            color: "var(--forge-muted)",
            fontSize: "var(--forge-text-sm)"
          }}
        >
          No preview
        </div>
      )}

      <div style={{ display: "grid", gap: "0.45rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
          <strong style={{ fontSize: "var(--forge-text-md)" }}>{item.title}</strong>
          <span style={{ ...chipStyle(), color: confidenceTone(item.confidence) }}>{item.confidence}</span>
        </div>
        <p style={{ margin: 0, color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)", lineHeight: 1.5 }}>
          {item.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {item.tags.filter(Boolean).slice(0, 4).map((tag) => (
            <span key={tag} style={chipStyle()}>
              {tag}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {detailHref ? (
            <a href={detailHref} target="_blank" rel="noreferrer" className="forge-btn forge-btn-primary" style={{ textDecoration: "none" }}>
              Open
            </a>
          ) : null}
          {item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="forge-btn" style={{ textDecoration: "none" }}>
              Source
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function GallerySection({
  title,
  items,
  downloadId,
  empty
}: {
  title: string;
  items: ScraperGalleryItem[];
  downloadId: string;
  empty: string;
}) {
  return (
    <section style={{ marginTop: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "var(--forge-text-lg)" }}>{title}</h3>
        <span style={chipStyle()}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="forge-panel" style={{ padding: "1rem", color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)" }}>
          {empty}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
          {items.map((item) => (
            <MediaTile key={item.id} item={item} downloadId={downloadId} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ScraperWorkbench() {
  const [mode, setMode] = useState<"capture" | "gallery">("capture");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<ScraperStatus | null>(null);
  const [logs, setLogs] = useState<ScraperLogEntry[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<ScraperGalleryIndexEntry[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<ScraperGalleryRecord | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearPoll();
    setRunning(false);
    setStatus(null);
    setLogs([]);
    setUrlError(null);
  }, [clearPoll]);

  const toggleExport = (format: ScraperExportFormat) => {
    setForm((current) => {
      const has = current.exportFormats.includes(format);
      const next = has ? current.exportFormats.filter((f) => f !== format) : [...current.exportFormats, format];
      return { ...current, exportFormats: next.length ? next : ["zip"] };
    });
  };

  const loadGalleryIndex = useCallback(async () => {
    try {
      const result = await getScrapeGalleryIndex();
      setGalleryIndex(result.items);
      if (!selectedGalleryId && result.items[0]) {
        setSelectedGalleryId(result.items[0].downloadId);
      }
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Failed to load gallery index");
    }
  }, [selectedGalleryId]);

  const loadGallery = useCallback(async (downloadId: string) => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const result = await getScrapeGallery(downloadId);
      setSelectedGallery(result);
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Failed to load gallery");
      setSelectedGallery(null);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const handleStart = async () => {
    if (running) return;
    setUrlError(null);

    if (!form.url.trim()) {
      setUrlError("URL is required");
      return;
    }
    try {
      new URL(form.url);
    } catch {
      setUrlError("Enter a valid URL (include https://)");
      return;
    }

    setRunning(true);
    setStatus(null);
    setLogs([]);
    setMode("capture");

    try {
      const { downloadId } = await startScrape({
        url: form.url,
        downloadType: form.downloadType,
        exportFormats: form.exportFormats,
        maxPages: form.maxPages,
        maxDepth: form.maxDepth
      });

      pollRef.current = setInterval(async () => {
        try {
          const [nextStatus, nextLogs] = await Promise.all([
            getScrapeStatus(downloadId),
            getScrapeLogs(downloadId)
          ]);
          setStatus(nextStatus);
          setLogs(nextLogs.logs);

          if (["completed", "failed", "stopped"].includes(nextStatus.status)) {
            clearPoll();
            setRunning(false);
            await loadGalleryIndex();
            if (nextStatus.status === "completed") {
              setSelectedGalleryId(downloadId);
              await loadGallery(downloadId);
            }
          }
        } catch (error) {
          console.error(error);
        }
      }, 1200);
    } catch (error) {
      setRunning(false);
      setUrlError(error instanceof Error ? error.message : "Failed to start capture");
    }
  };

  const handleStop = async () => {
    if (!status?.downloadId) return;
    try {
      await stopScrape(status.downloadId);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => () => clearPoll(), [clearPoll]);

  useEffect(() => {
    void loadGalleryIndex();
  }, [loadGalleryIndex]);

  useEffect(() => {
    if (!selectedGalleryId) return;
    void loadGallery(selectedGalleryId);
  }, [selectedGalleryId, loadGallery]);

  const currentPhaseIdx = status ? phaseIndex(status.phase) : -1;
  const isComplete = status?.status === "completed" || status?.status === "stopped";
  const isFailed = status?.status === "failed";

  const phaseProgress = useMemo(() => {
    if (!status) return { crawling: 0, rendering: 0, assets: 0, observing: 0, packaging: 0 };
    const idx = phaseIndex(status.phase);
    return {
      crawling: idx > 0 ? 100 : idx === 0 ? status.phaseProgress : 0,
      rendering: idx > 1 ? 100 : idx === 1 ? status.phaseProgress : 0,
      assets: idx > 2 ? 100 : idx === 2 ? status.phaseProgress : 0,
      observing: idx > 3 ? 100 : idx === 3 ? status.phaseProgress : 0,
      packaging: idx > 4 ? 100 : idx === 4 ? status.phaseProgress : status.phase === "done" ? 100 : 0
    };
  }, [status]);

  const galleryTotals = useMemo(() => {
    return galleryIndex.reduce(
      (acc, item) => {
        acc.sites += 1;
        acc.assets += item.metrics.assets;
        acc.animations += item.metrics.animations;
        acc.icons += item.metrics.icons;
        acc.caseStudies += item.metrics.caseStudies;
        return acc;
      },
      { sites: 0, assets: 0, animations: 0, icons: 0, caseStudies: 0 }
    );
  }, [galleryIndex]);

  return (
    <AppShell
      top={
        <TopNav
          wordmark="Rendered Runtime"
          items={[
            { id: "scraper", label: "Scraper", href: "/scraper", active: true },
            { id: "dashboard", label: "Dashboard", href: "/" }
          ]}
          overflowItems={[
            { id: "gallery", label: "Gallery", href: "/scraper", active: false },
            { id: "wiki", label: "Memory Wiki", href: "/wiki" }
          ]}
        />
      }
    >
      <main className="forge-root" style={{ padding: "1.25rem", maxWidth: 1220, margin: "0 auto" }}>
        <ForgeSectionHeader
          kicker="agentos / rendered runtime"
          title="Rendered Runtime Capture"
          copy="A dump box for hard modern websites: render once, capture everything, auto-classify it, and publish it into a showcase gallery."
        />

        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          <ForgeSegmentedControl
            ariaLabel="Scraper mode"
            value={mode}
            onChange={(id) => setMode(id as "capture" | "gallery")}
            options={[
              { id: "capture", label: "Capture" },
              { id: "gallery", label: "Gallery" }
            ]}
          />
        </div>

        {mode === "capture" ? (
          <>
            <div
              className="forge-panel forge-card-glow"
              style={{ padding: "1.25rem", marginBottom: "1.25rem", marginTop: "1rem" }}
            >
              <div
                style={{
                  border: "1px dashed var(--forge-border-strong)",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1rem",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <div style={{ fontSize: "var(--forge-text-sm)", color: "var(--forge-muted)", marginBottom: "0.35rem" }}>
                  Automated dump box
                </div>
                <div style={{ fontSize: "var(--forge-text-md)", color: "var(--forge-text)" }}>
                  Drop in the source URL and the pipeline will sort websites, assets, icons, animations, motion protocols, and loading references into the gallery automatically.
                </div>
              </div>

              <label htmlFor="scraper-url" style={{ display: "block", fontSize: "var(--forge-text-sm)", marginBottom: "0.5rem" }}>
                Target URL
              </label>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <input
                  id="scraper-url"
                  type="url"
                  value={form.url}
                  disabled={running}
                  placeholder="https://example.com"
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                  style={{
                    flex: "1 1 280px",
                    minWidth: 0,
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--forge-radius-md)",
                    border: `1px solid ${urlError ? "var(--forge-red)" : "var(--forge-border)"}`,
                    background: "var(--forge-panel-sunken)",
                    color: "var(--forge-text)",
                    fontSize: "var(--forge-text-md)"
                  }}
                />
                <MagneticButton variant="primary" disabled={running} onClick={() => void handleStart()}>
                  {running ? "Capturing..." : "Start capture"}
                </MagneticButton>
                {running && status?.downloadId ? (
                  <button type="button" className="forge-btn" onClick={() => void handleStop()}>
                    Stop
                  </button>
                ) : null}
                <button type="button" className="forge-btn" onClick={reset} disabled={running && !isComplete && !isFailed}>
                  Reset
                </button>
              </div>
              {urlError ? (
                <p style={{ color: "var(--forge-red)", fontSize: "var(--forge-text-sm)", marginTop: "0.5rem" }}>{urlError}</p>
              ) : null}

              <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <ForgeSegmentedControl
                  ariaLabel="Download mode"
                  value={form.downloadType}
                  onChange={(id) => setForm({ ...form, downloadType: id as "full" | "single" })}
                  options={[
                    { id: "single", label: "Single page" },
                    { id: "full", label: "Multi-page" }
                  ]}
                />
                <button
                  type="button"
                  className="forge-btn"
                  style={{ fontSize: "var(--forge-text-xs)" }}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"} advanced
                </button>
              </div>

              {showAdvanced ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
                  <label style={{ fontSize: "var(--forge-text-sm)" }}>
                    Max pages
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.maxPages}
                      disabled={running}
                      onChange={(e) => setForm({ ...form, maxPages: Number(e.target.value) })}
                      style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--forge-border)", background: "var(--forge-panel-sunken)", color: "var(--forge-text)" }}
                    />
                  </label>
                  <label style={{ fontSize: "var(--forge-text-sm)" }}>
                    Max depth
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.maxDepth}
                      disabled={running}
                      onChange={(e) => setForm({ ...form, maxDepth: Number(e.target.value) })}
                      style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--forge-border)", background: "var(--forge-panel-sunken)", color: "var(--forge-text)" }}
                    />
                  </label>
                </div>
              ) : null}

              <div style={{ marginTop: "1.25rem" }}>
                <p style={{ fontSize: "var(--forge-text-sm)", color: "var(--forge-muted)", marginBottom: "0.5rem" }}>
                  Export formats
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {ALL_EXPORTS.map((format) => {
                    const selected = form.exportFormats.includes(format);
                    const meta = EXPORT_LABELS[format];
                    return (
                      <button
                        key={format}
                        type="button"
                        disabled={running}
                        onClick={() => toggleExport(format)}
                        className={`forge-btn ${selected ? "forge-btn-primary" : ""}`}
                        style={{ textAlign: "left", padding: "0.6rem 0.85rem" }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "var(--forge-text-sm)" }}>{meta.label}</div>
                        <div style={{ fontSize: "var(--forge-text-xs)", opacity: 0.8 }}>{meta.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {(running || status) && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1.25rem"
                  }}
                >
                  <ForgeStatCard
                    label="Overall"
                    value={status ? `${status.progress}%` : "0%"}
                    caption={status?.eta ?? (running ? "Estimating..." : "Idle")}
                    accent
                    featured
                  />
                  <ForgeStatCard label="Pages" value={String(status?.pagesCrawled ?? 0)} caption={`${status?.pagesFound ?? 0} discovered`} />
                  <ForgeStatCard label="Assets" value={String(status?.assetsDownloaded ?? 0)} caption={`of ${status?.assetsTotal ?? 0} total`} />
                  <ForgeStatCard label="Size" value={status?.totalSize ?? "0 B"} caption={`${status?.filesDownloaded ?? 0} files`} />
                </div>

                <div className="forge-panel" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "var(--forge-text-lg)" }}>Pipeline progress</h3>
                    <span
                      style={{
                        fontSize: "var(--forge-text-xs)",
                        padding: "0.2rem 0.55rem",
                        borderRadius: 999,
                        background: "var(--forge-accent-dim)",
                        color: "var(--forge-accent-bright)"
                      }}
                    >
                      {status ? PHASE_LABELS[status.phase] : "Ready"}
                    </span>
                  </div>

                  {PHASE_ORDER.slice(0, 5).map((phase, index) => (
                    <ProgressBar
                      key={phase}
                      label={PHASE_LABELS[phase]}
                      value={phaseProgress[phase as keyof typeof phaseProgress]}
                      active={currentPhaseIdx === index}
                      complete={currentPhaseIdx > index || status?.phase === "done"}
                    />
                  ))}

                  {isFailed && status?.error ? (
                    <p style={{ color: "var(--forge-red)", marginTop: "0.75rem", fontSize: "var(--forge-text-sm)" }}>
                      {status.error}
                    </p>
                  ) : null}
                </div>

                {isComplete && status?.exportsReady.length ? (
                  <div className="forge-panel" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
                    <h3 style={{ marginTop: 0, fontSize: "var(--forge-text-lg)" }}>Exports ready</h3>
                    <p style={{ color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)", marginTop: 0 }}>
                      ZIP includes rendered HTML, screenshots, and captured asset evidence. JSON and CSV provide the structured extraction record.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {status.exportsReady.map((format) => (
                        <a
                          key={format}
                          href={scrapeExportUrl(status.downloadId, format)}
                          className="forge-btn forge-btn-primary"
                          download
                          style={{ textDecoration: "none" }}
                        >
                          Download {EXPORT_LABELS[format].label}
                        </a>
                      ))}
                      <button
                        type="button"
                        className="forge-btn"
                        onClick={() => setMode("gallery")}
                      >
                        Open gallery
                      </button>
                    </div>
                  </div>
                ) : null}

                <TerminalWindow title="Capture log" subtitle="Live output from the rendered runtime pipeline">
                  <div ref={logRef} style={{ maxHeight: 280, overflowY: "auto" }}>
                    {logs.length === 0 ? (
                      <p style={{ color: "var(--forge-muted)", margin: 0 }}>Waiting for log output...</p>
                    ) : (
                      logs.map((entry, index) => (
                        <div
                          key={`${entry.timestamp}-${index}`}
                          style={{
                            color:
                              entry.level === "error"
                                ? "var(--forge-red)"
                                : entry.level === "warning"
                                  ? "#f5c842"
                                  : "var(--forge-green)",
                            marginBottom: "0.35rem"
                          }}
                        >
                          <span style={{ color: "var(--forge-muted)" }}>
                            [{new Date(entry.timestamp).toLocaleTimeString()}]
                          </span>{" "}
                          {entry.message}
                        </div>
                      ))
                    )}
                  </div>
                </TerminalWindow>
              </>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
                marginTop: "1rem",
                marginBottom: "1.25rem"
              }}
            >
              <ForgeStatCard label="Sites" value={String(galleryTotals.sites)} caption="Captured showcases" accent featured />
              <ForgeStatCard label="Assets" value={String(galleryTotals.assets)} caption="Classified into the gallery" />
              <ForgeStatCard label="Animations" value={String(galleryTotals.animations)} caption="Observed motion behaviors" />
              <ForgeStatCard label="Icons" value={String(galleryTotals.icons)} caption="Vector and favicon surfaces" />
              <ForgeStatCard label="Case Studies" value={String(galleryTotals.caseStudies)} caption="Notable preserved references" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: "1rem", alignItems: "start" }}>
              <aside className="forge-panel" style={{ padding: "1rem", position: "sticky", top: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "var(--forge-text-lg)" }}>Showroom index</h3>
                  <button type="button" className="forge-btn" onClick={() => void loadGalleryIndex()}>
                    Refresh
                  </button>
                </div>
                {galleryIndex.length === 0 ? (
                  <div style={{ color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)" }}>
                    Run a capture and it will land here automatically.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "0.65rem" }}>
                    {galleryIndex.map((entry) => (
                      <button
                        key={entry.downloadId}
                        type="button"
                        onClick={() => setSelectedGalleryId(entry.downloadId)}
                        className="forge-btn"
                        style={{
                          textAlign: "left",
                          padding: "0.85rem",
                          borderColor: selectedGalleryId === entry.downloadId ? "var(--forge-accent)" : "var(--forge-border-strong)"
                        }}
                      >
                        <div style={{ display: "grid", gap: "0.35rem" }}>
                          <strong style={{ fontSize: "var(--forge-text-sm)" }}>{entry.title}</strong>
                          <span style={{ color: "var(--forge-muted)", fontSize: "var(--forge-text-xs)" }}>{entry.sourceUrl}</span>
                          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            <span style={chipStyle()}>{entry.metrics.assets} assets</span>
                            <span style={chipStyle()}>{entry.metrics.animations} motions</span>
                            <span style={chipStyle()}>{entry.hosting.platform}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              <section style={{ minWidth: 0 }}>
                {galleryLoading ? (
                  <div className="forge-panel" style={{ padding: "1rem" }}>
                    Loading gallery...
                  </div>
                ) : galleryError ? (
                  <div className="forge-panel" style={{ padding: "1rem", color: "var(--forge-red)" }}>
                    {galleryError}
                  </div>
                ) : !selectedGallery ? (
                  <div className="forge-panel" style={{ padding: "1rem", color: "var(--forge-muted)" }}>
                    Select a captured site to inspect its gallery.
                  </div>
                ) : (
                  <>
                    <div className="forge-panel forge-card-glow" style={{ padding: "1.1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start", flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ margin: 0, fontSize: "var(--forge-text-xl)" }}>{selectedGallery.title}</h2>
                          <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                            <span style={chipStyle()}>{selectedGallery.hosting.platform}</span>
                            <span style={chipStyle()}>{selectedGallery.hosting.fit}</span>
                            {selectedGallery.frameworkDetection.map((framework) => (
                              <span key={framework} style={chipStyle()}>{framework}</span>
                            ))}
                          </div>
                          <p style={{ margin: "0.8rem 0 0", color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)", lineHeight: 1.5 }}>
                            {selectedGallery.hosting.rationale}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <a href={selectedGallery.sourceUrl} target="_blank" rel="noreferrer" className="forge-btn forge-btn-primary" style={{ textDecoration: "none" }}>
                            Open source site
                          </a>
                          {selectedGallery.websites[0]?.localPath ? (
                            <a
                              href={scrapeFileUrl(selectedGallery.downloadId, selectedGallery.websites[0].localPath!)}
                              target="_blank"
                              rel="noreferrer"
                              className="forge-btn"
                              style={{ textDecoration: "none" }}
                            >
                              Open captured page
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: "0.75rem",
                          marginTop: "1rem"
                        }}
                      >
                        <ForgeStatCard label="Automation" value={`${selectedGallery.metrics.automationCoveragePercent}%`} caption="Auto-sorted into the gallery" accent />
                        <ForgeStatCard label="Confidence" value={`${selectedGallery.metrics.confidenceScore}`} caption="Aggregate extraction confidence" />
                        <ForgeStatCard label="Assets" value={String(selectedGallery.metrics.assets)} caption="Captured asset records" />
                        <ForgeStatCard label="Motion" value={String(selectedGallery.metrics.motionProtocols)} caption="Protocols and interactions" />
                      </div>

                      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                        <div className="forge-panel" style={{ padding: "0.9rem" }}>
                          <div style={{ fontSize: "var(--forge-text-sm)", color: "var(--forge-muted)", marginBottom: "0.35rem" }}>Source contacts</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                            {selectedGallery.contacts.emails.map((email) => (
                              <a key={email} href={`mailto:${email}`} className="forge-btn" style={{ textDecoration: "none" }}>{email}</a>
                            ))}
                            {selectedGallery.contacts.phones.map((phone) => (
                              <a key={phone} href={`tel:${phone}`} className="forge-btn" style={{ textDecoration: "none" }}>{phone}</a>
                            ))}
                            {selectedGallery.contacts.socialLinks.map((link) => (
                              <a key={link} href={link} target="_blank" rel="noreferrer" className="forge-btn" style={{ textDecoration: "none" }}>
                                Social
                              </a>
                            ))}
                            {selectedGallery.contacts.emails.length === 0 &&
                            selectedGallery.contacts.phones.length === 0 &&
                            selectedGallery.contacts.socialLinks.length === 0 ? (
                              <span style={{ color: "var(--forge-muted)", fontSize: "var(--forge-text-sm)" }}>
                                No contact signals were detected in the visible runtime pass.
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <GallerySection
                      title="Actual Websites"
                      items={selectedGallery.websites}
                      downloadId={selectedGallery.downloadId}
                      empty="The original pages will appear here once a capture is complete."
                    />
                    <GallerySection
                      title="Case Studies"
                      items={selectedGallery.caseStudies}
                      downloadId={selectedGallery.downloadId}
                      empty="Notable preserved layouts, assets, and motion relationships will show up here."
                    />
                    <GallerySection
                      title="Icons"
                      items={selectedGallery.icons}
                      downloadId={selectedGallery.downloadId}
                      empty="Icon and favicon surfaces will auto-sort here."
                    />
                    <GallerySection
                      title="Animations"
                      items={selectedGallery.animations}
                      downloadId={selectedGallery.downloadId}
                      empty="Observed animation behaviors will auto-sort here."
                    />
                    <GallerySection
                      title="Motion Protocols"
                      items={selectedGallery.motionProtocols}
                      downloadId={selectedGallery.downloadId}
                      empty="Interaction patterns, sticky rules, and movement protocols will auto-sort here."
                    />
                    <GallerySection
                      title="Loading Screens"
                      items={selectedGallery.loadingScreens}
                      downloadId={selectedGallery.downloadId}
                      empty="Loader patterns and boot/entrance references will auto-sort here."
                    />
                    <GallerySection
                      title="Asset Gallery"
                      items={selectedGallery.assets}
                      downloadId={selectedGallery.downloadId}
                      empty="Captured assets will show here after the scrape lands."
                    />
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}

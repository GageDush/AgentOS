import { resolveApiBase } from "./agentos-api";

export type ScraperDownloadType = "full" | "single";
export type ScraperExportFormat = "zip" | "json" | "csv";
export type ScraperPhase =
  | "idle"
  | "crawling"
  | "rendering"
  | "assets"
  | "observing"
  | "packaging"
  | "done"
  | "failed"
  | "stopped";

export interface ScraperStartRequest {
  url: string;
  downloadType: ScraperDownloadType;
  exportFormats: ScraperExportFormat[];
  maxPages?: number;
  maxDepth?: number;
}

export interface ScraperStatus {
  downloadId: string;
  url: string;
  status: "running" | "completed" | "failed" | "stopped";
  phase: ScraperPhase;
  progress: number;
  phaseProgress: number;
  pagesFound: number;
  pagesCrawled: number;
  assetsTotal: number;
  assetsDownloaded: number;
  filesDownloaded: number;
  totalSize: string;
  eta: string | null;
  error?: string | null;
  exportFormats: ScraperExportFormat[];
  exportsReady: ScraperExportFormat[];
}

export interface ScraperLogEntry {
  level: "info" | "warning" | "error";
  message: string;
  timestamp: string;
}

export interface ScraperContactRecord {
  emails: string[];
  phones: string[];
  socialLinks: string[];
  generalLinks: string[];
}

export interface ScraperHostingRecommendation {
  platform: string;
  fit: "excellent" | "good" | "conditional";
  rationale: string;
  softwareDetected: string[];
}

export interface ScraperGalleryMetrics {
  pages: number;
  assets: number;
  animations: number;
  icons: number;
  loadingScreens: number;
  motionProtocols: number;
  caseStudies: number;
  confidenceScore: number;
  automationCoveragePercent: number;
}

export interface ScraperGalleryItem {
  id: string;
  title: string;
  kind: "website" | "asset" | "icon" | "animation" | "loading_screen" | "motion_protocol" | "case_study";
  category: "websites" | "case_studies" | "icons" | "animations" | "loading_screens" | "motion_protocols" | "assets";
  previewPath?: string;
  localPath?: string;
  sourceUrl?: string;
  pageUrl?: string;
  description: string;
  tags: string[];
  confidence: "high" | "medium" | "low";
  assetId?: string;
  animationId?: string;
  interactionId?: string;
}

export interface ScraperGalleryRecord {
  downloadId: string;
  sourceUrl: string;
  title: string;
  createdAt: string;
  frameworkDetection: string[];
  contacts: ScraperContactRecord;
  metrics: ScraperGalleryMetrics;
  hosting: ScraperHostingRecommendation;
  websites: ScraperGalleryItem[];
  caseStudies: ScraperGalleryItem[];
  icons: ScraperGalleryItem[];
  animations: ScraperGalleryItem[];
  loadingScreens: ScraperGalleryItem[];
  motionProtocols: ScraperGalleryItem[];
  assets: ScraperGalleryItem[];
}

export interface ScraperGalleryIndexEntry {
  downloadId: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  previewPath?: string;
  frameworkDetection: string[];
  metrics: ScraperGalleryMetrics;
  hosting: ScraperHostingRecommendation;
}

async function scraperFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveApiBase()}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init
  });
  const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export function startScrape(request: ScraperStartRequest) {
  return scraperFetch<{ downloadId: string }>("/scraper/download", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function getScrapeStatus(downloadId: string) {
  return scraperFetch<ScraperStatus>(`/scraper/status/${downloadId}`);
}

export function getScrapeLogs(downloadId: string) {
  return scraperFetch<{ logs: ScraperLogEntry[] }>(`/scraper/logs/${downloadId}`);
}

export function getScrapeGalleryIndex() {
  return scraperFetch<{ items: ScraperGalleryIndexEntry[] }>("/scraper/gallery");
}

export function getScrapeGallery(downloadId: string) {
  return scraperFetch<ScraperGalleryRecord>(`/scraper/gallery/${downloadId}`);
}

export function stopScrape(downloadId: string) {
  return scraperFetch<{ success: boolean }>(`/scraper/stop/${downloadId}`, { method: "POST" });
}

export function scrapeExportUrl(downloadId: string, format: ScraperExportFormat) {
  return `${resolveApiBase()}/scraper/export/${downloadId}/${format}`;
}

export function scrapeFileUrl(downloadId: string, localPath: string) {
  return `${resolveApiBase()}/scraper/file/${downloadId}?path=${encodeURIComponent(localPath)}`;
}

export const PHASE_LABELS: Record<ScraperPhase, string> = {
  idle: "Ready",
  crawling: "Route discovery",
  rendering: "Runtime render",
  assets: "Asset evidence",
  observing: "Interaction pass",
  packaging: "Bundle exports",
  done: "Complete",
  failed: "Failed",
  stopped: "Stopped"
};

export const EXPORT_LABELS: Record<ScraperExportFormat, { label: string; hint: string }> = {
  zip: { label: "ZIP bundle", hint: "Rendered HTML, screenshots, and evidence files" },
  json: { label: "JSON manifest", hint: "Structured runtime extraction record" },
  csv: { label: "CSV inventory", hint: "Flat asset and page evidence list" }
};

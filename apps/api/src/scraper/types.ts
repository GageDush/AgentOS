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

export type ScraperLogLevel = "info" | "warning" | "error";
export type ScraperExtractionMode =
  | "static_html"
  | "rendered_runtime"
  | "screenshot_inference"
  | "network_asset"
  | "css_asset"
  | "mixed";
export type ScraperConfidence = "high" | "medium" | "low";

export interface ScraperLogEntry {
  level: ScraperLogLevel;
  message: string;
  timestamp: string;
}

export interface ScraperStartRequest {
  url: string;
  downloadType?: ScraperDownloadType;
  exportFormats?: ScraperExportFormat[];
  maxPages?: number;
  maxDepth?: number;
}

export interface ScraperSourceEvidence {
  domSelector: string;
  visibleTextNearby: string;
  screenshotRegion: string;
  networkUrl: string;
  cssReference: string;
  interactionObserved: string;
}

export interface ScraperContactRecord {
  emails: string[];
  phones: string[];
  socialLinks: string[];
  generalLinks: string[];
}

export interface ScraperAssetRecord {
  id: string;
  label: string;
  url: string;
  localPath: string;
  bytes: number;
  extractionMode: ScraperExtractionMode;
  confidence: ScraperConfidence;
  sourceEvidence: ScraperSourceEvidence;
  rightsNote: string;
  preservationNote: string;
  contentType?: string;
}

export interface ScraperScreenshotRecord {
  kind: "above_fold" | "full_page" | "mobile";
  localPath: string;
  width: number;
  height: number;
}

export interface ScraperInteractionRecord {
  id: string;
  type: "hover" | "click" | "scroll" | "sticky" | "carousel" | "modal" | "drawer" | "dropdown" | "unknown";
  label: string;
  observedBehavior: string;
  selector: string;
  confidence: ScraperConfidence;
}

export interface ScraperAnimationRecord {
  id: string;
  type: string;
  suggestedAiLabel: string;
  trigger: string;
  observedBehavior: string;
  likelyFramework: string;
  functionalImportance: "decorative" | "important" | "critical" | "unknown";
  canRecreateWith: string[];
  fallbackIfRemoved: string;
  preservationNote: string;
  confidence: ScraperConfidence;
}

export interface ScraperPageRecord {
  url: string;
  title: string;
  localPath: string;
  depth: number;
  extractionMode: ScraperExtractionMode;
  confidence: ScraperConfidence;
  renderedHtmlPath: string;
  screenshots: ScraperScreenshotRecord[];
  assetIds: string[];
  cssReferences: string[];
  scriptReferences: string[];
  networkAssetUrls: string[];
  frameworkDetection: string[];
  interactions: ScraperInteractionRecord[];
  animations: ScraperAnimationRecord[];
  contacts: ScraperContactRecord;
  directExtractionSummary: string[];
  screenshotInferenceSummary: string[];
  manualReview: string[];
  designInspirationOnly: string[];
  functionalityToPreserve: string[];
}

export interface ScraperManifest {
  downloadId: string;
  url: string;
  downloadType: ScraperDownloadType;
  extractionMode: "rendered_runtime";
  startedAt: string;
  finishedAt?: string;
  pages: ScraperPageRecord[];
  assets: ScraperAssetRecord[];
  totalBytes: number;
  exportFormats: ScraperExportFormat[];
  frameworkDetection: string[];
  directExtraction: string[];
  screenshotInferences: string[];
  manualReview: string[];
  designInspirationOnly: string[];
  functionalityToPreserve: string[];
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
  confidence: ScraperConfidence;
  assetId?: string;
  animationId?: string;
  interactionId?: string;
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

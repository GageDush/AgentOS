import { createWriteStream, existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import puppeteer, { type Browser, type ElementHandle, type HTTPResponse, type Page } from "puppeteer";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type {
  ScraperAnimationRecord,
  ScraperAssetRecord,
  ScraperConfidence,
  ScraperContactRecord,
  ScraperDownloadType,
  ScraperExportFormat,
  ScraperExtractionMode,
  ScraperGalleryIndexEntry,
  ScraperGalleryItem,
  ScraperGalleryMetrics,
  ScraperGalleryRecord,
  ScraperHostingRecommendation,
  ScraperInteractionRecord,
  ScraperLogEntry,
  ScraperLogLevel,
  ScraperManifest,
  ScraperPageRecord,
  ScraperPhase,
  ScraperScreenshotRecord,
  ScraperSourceEvidence,
  ScraperStartRequest,
  ScraperStatus
} from "./types.js";

const DEFAULT_MAX_PAGES = 20;
const DEFAULT_MAX_DEPTH = 2;
const REQUEST_TIMEOUT = 45_000;
const STABLE_WAIT_MS = 1_500;
const DESKTOP_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    : undefined,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser"
].filter((value): value is string => Boolean(value));

type JobStatus = "running" | "completed" | "failed" | "stopped";

interface RuntimePageAnalysis {
  title: string;
  visibleTextSnippets: string[];
  discoveredLinks: string[];
  scriptReferences: string[];
  cssReferences: string[];
  networkAssetUrls: string[];
  frameworkDetection: string[];
  assets: Array<{
    key: string;
    labelHint: string;
    kind: string;
    sourceUrl: string;
    extractionMode: ScraperExtractionMode;
    confidence: ScraperConfidence;
    contentType?: string;
    selector?: string;
    nearbyText?: string;
    screenshotRegion?: string;
    cssReference?: string;
    interactionObserved?: string;
    preservationNote?: string;
  }>;
  animations: ScraperAnimationRecord[];
  interactions: ScraperInteractionRecord[];
  contacts: ScraperContactRecord;
  directExtractionSummary: string[];
  screenshotInferenceSummary: string[];
  manualReview: string[];
  designInspirationOnly: string[];
  functionalityToPreserve: string[];
}

interface AssetCandidate {
  url: string;
  localPath: string;
  extractionMode: ScraperExtractionMode;
  confidence: ScraperConfidence;
  contentType?: string;
  labelHint: string;
  sourceEvidence: ScraperSourceEvidence;
  rightsNote: string;
  preservationNote: string;
}

interface ScraperJob {
  downloadId: string;
  url: string;
  downloadType: ScraperDownloadType;
  exportFormats: ScraperExportFormat[];
  maxPages: number;
  maxDepth: number;
  status: JobStatus;
  phase: ScraperPhase;
  progress: number;
  phaseProgress: number;
  pagesFound: number;
  pagesCrawled: number;
  assetsTotal: number;
  assetsDownloaded: number;
  filesDownloaded: number;
  totalBytes: number;
  logs: ScraperLogEntry[];
  stopRequested: boolean;
  startedAt: number;
  finishedAt?: number;
  outputDir: string;
  zipPath: string;
  jsonPath: string;
  csvPath: string;
  manifest?: ScraperManifest;
  error?: string;
  exportsReady: ScraperExportFormat[];
}

function getChromeExecutable() {
  for (const candidate of CHROME_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeUrl(url: string, base: string) {
  try {
    return new URL(url, base).href.split("#")[0];
  } catch {
    return null;
  }
}

function isSameOrigin(url: string, origin: string) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function safeFilename(value: string) {
  return value.replace(/[:*?"<>|]/g, "_");
}

function pageSlug(url: string) {
  const parsed = new URL(url);
  const host = sanitizeSlug(parsed.hostname);
  const pathname = sanitizeSlug(parsed.pathname || "index");
  const suffix = sanitizeSlug(parsed.searchParams.toString());
  return [host, pathname || "index", suffix].filter(Boolean).join("__");
}

function htmlOutputPath(url: string) {
  return path.posix.join("pages", `${pageSlug(url)}.rendered.html`);
}

function screenshotOutputPath(url: string, kind: ScraperScreenshotRecord["kind"]) {
  return path.posix.join("screenshots", `${pageSlug(url)}.${kind}.png`);
}

function assetOutputPath(url: string, contentType?: string) {
  const parsed = new URL(url);
  const host = sanitizeSlug(parsed.hostname);
  const pathname = safeFilename(parsed.pathname.replace(/^\//, "")) || "asset";
  const extFromPath = path.extname(pathname);
  const extFromType = contentType?.includes("svg")
    ? ".svg"
    : contentType?.includes("png")
      ? ".png"
      : contentType?.includes("jpeg")
        ? ".jpg"
        : contentType?.includes("webp")
          ? ".webp"
          : contentType?.includes("gif")
            ? ".gif"
            : contentType?.includes("mp4")
              ? ".mp4"
              : contentType?.includes("css")
                ? ".css"
                : contentType?.includes("javascript")
                  ? ".js"
                  : "";
  const extension = extFromPath || extFromType;
  const base = extFromPath ? pathname.slice(0, -extFromPath.length) : pathname;
  return path.posix.join("assets", host, `${base}${extension}`);
}

function screenshotInferenceOutputPath(pageUrl: string, label: string) {
  return path.posix.join("derived", `${pageSlug(pageUrl)}.${sanitizeSlug(label) || "inferred_asset"}.txt`);
}

function galleryOutputPath(downloadId: string) {
  return `${downloadId}.gallery.json`;
}

function looksSafeRelativePath(localPath: string) {
  return !path.isAbsolute(localPath) && !localPath.includes("..");
}

function mimeTypeForPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

function emptyEvidence(overrides: Partial<ScraperSourceEvidence> = {}): ScraperSourceEvidence {
  return {
    domSelector: "",
    visibleTextNearby: "",
    screenshotRegion: "",
    networkUrl: "",
    cssReference: "",
    interactionObserved: "",
    ...overrides
  };
}

async function ensureFileDir(root: string, localPath: string) {
  await fs.mkdir(path.join(root, path.dirname(localPath)), { recursive: true });
}

async function writeBuffer(root: string, localPath: string, buffer: Buffer) {
  await ensureFileDir(root, localPath);
  await fs.writeFile(path.join(root, localPath), buffer);
}

async function writeText(root: string, localPath: string, content: string) {
  await ensureFileDir(root, localPath);
  await fs.writeFile(path.join(root, localPath), content, "utf8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function gotoStable(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });
  try {
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 10_000 });
  } catch {
    // Some animation-heavy sites never become truly idle.
  }
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 10_000 }).catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(STABLE_WAIT_MS);
}

function mergeUnique<T>(target: T[], values: Iterable<T>) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

function inferAssetLabel(kind: string, hint: string, nearbyText: string) {
  const words = `${hint} ${nearbyText}`.trim();
  const semantic = sanitizeSlug(words);
  if (semantic) return semantic;
  if (kind === "background") return "background_image_asset";
  if (kind === "canvas") return "interactive_webgl_or_canvas_background";
  if (kind === "og_image") return "open_graph_preview_image";
  if (kind === "favicon") return "site_favicon_asset";
  if (kind === "svg") return "inline_vector_asset";
  return "rendered_asset";
}

function importanceFromLabel(label: string): ScraperAnimationRecord["functionalImportance"] {
  if (label.includes("nav") || label.includes("cta") || label.includes("pricing")) return "important";
  if (label.includes("hero") || label.includes("sticky")) return "critical";
  return "decorative";
}

function dedupeStrings(values: Iterable<string>) {
  return Array.from(new Set(Array.from(values).filter(Boolean)));
}

function mergeContacts(contacts: ScraperContactRecord[]): ScraperContactRecord {
  const normalizeSocial = (value: string) => {
    const cleaned = value.replace(/^https:\/\/https\.\//i, "https://").replace(/^http:\/\/www\./i, "https://www.");
    try {
      return new URL(cleaned).href;
    } catch {
      return "";
    }
  };
  const normalizePhone = (value: string) => value.replace(/\s+/g, " ").trim();
  const looksLikePhone = (value: string) => {
    const compact = value.replace(/[^\d+]/g, "");
    if (value.includes("\n")) return false;
    if (/^\d{4}-\d{4}$/.test(value)) return false;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
    return compact.length >= 10 && compact.length <= 16;
  };

  return {
    emails: dedupeStrings(contacts.flatMap((entry) => entry.emails)),
    phones: dedupeStrings(contacts.flatMap((entry) => entry.phones).map(normalizePhone).filter(looksLikePhone)),
    socialLinks: dedupeStrings(contacts.flatMap((entry) => entry.socialLinks).map(normalizeSocial)),
    generalLinks: dedupeStrings(contacts.flatMap((entry) => entry.generalLinks))
  };
}

function averageConfidence(records: Array<{ confidence: ScraperConfidence }>) {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, record) => sum + (record.confidence === "high" ? 100 : record.confidence === "medium" ? 70 : 40), 0);
  return Math.round(total / records.length);
}

function looksLikeIcon(asset: ScraperAssetRecord) {
  return (
    asset.label.includes("icon") ||
    asset.label.includes("favicon") ||
    asset.contentType?.includes("svg") ||
    asset.localPath.endsWith(".svg")
  );
}

function looksLikeLoaderAsset(asset: ScraperAssetRecord) {
  const text = `${asset.label} ${asset.preservationNote}`.toLowerCase();
  return text.includes("load") || text.includes("spinner") || text.includes("boot");
}

function buildHostingRecommendation(manifest: ScraperManifest): ScraperHostingRecommendation {
  const detected = inferFrameworkDetection(manifest);
  if (detected.includes("framer_runtime_or_react_generated_site")) {
    return {
      platform: "Vercel or Netlify",
      fit: "excellent",
      rationale: "Best fit for animation-heavy React or Framer-style marketing sites that need solid asset delivery and painless preview deploys.",
      softwareDetected: detected
    };
  }
  if (detected.includes("nextjs_runtime")) {
    return {
      platform: "Vercel",
      fit: "excellent",
      rationale: "Native fit for Next.js-style bundles, preview environments, and edge-friendly static or hybrid delivery.",
      softwareDetected: detected
    };
  }
  if (detected.includes("webflow_runtime")) {
    return {
      platform: "Webflow hosting or Netlify",
      fit: "good",
      rationale: "Good fit when the original experience leans on designer-authored CMS pages and polished marketing delivery.",
      softwareDetected: detected
    };
  }
  return {
    platform: "Cloudflare Pages or Netlify",
    fit: "good",
    rationale: "A straightforward static hosting fit for exported rendered assets, screenshots, and lightweight showcase surfaces.",
    softwareDetected: detected
  };
}

function inferFrameworkDetection(manifest: ScraperManifest) {
  const detected = new Set<string>(manifest.frameworkDetection);
  const haystack = [
    manifest.url,
    ...manifest.pages.flatMap((page) => [
      page.url,
      ...page.frameworkDetection,
      ...page.scriptReferences,
      ...page.cssReferences,
      ...page.networkAssetUrls
    ]),
    ...manifest.assets.map((asset) => asset.url)
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("framer") || haystack.includes("framerusercontent") || haystack.includes("framer.ai")) {
    detected.add("framer_runtime_or_react_generated_site");
  }
  if (haystack.includes("__next") || haystack.includes("nextjs") || haystack.includes("_next/")) detected.add("nextjs_runtime");
  if (haystack.includes("webflow")) detected.add("webflow_runtime");
  if (haystack.includes("gsap")) detected.add("gsap_runtime");
  if (haystack.includes("three")) detected.add("threejs_runtime");
  if (haystack.includes("lottie")) detected.add("lottie_runtime");

  return Array.from(detected);
}

function makeGalleryItem(
  item: Omit<ScraperGalleryItem, "tags"> & { tags?: string[] }
): ScraperGalleryItem {
  return {
    ...item,
    tags: item.tags ?? []
  };
}

function buildGalleryRecord(manifest: ScraperManifest): ScraperGalleryRecord {
  const contacts = mergeContacts(manifest.pages.map((page) => page.contacts));
  const frameworkDetection = inferFrameworkDetection(manifest);
  const websites = manifest.pages.map((page, index) =>
    makeGalleryItem({
      id: `website_${index + 1}`,
      title: page.title,
      kind: "website",
      category: "websites",
      previewPath: page.screenshots.find((shot) => shot.kind === "above_fold")?.localPath ?? page.screenshots[0]?.localPath,
      localPath: page.renderedHtmlPath,
      sourceUrl: page.url,
      pageUrl: page.url,
      description: page.directExtractionSummary[0] ?? "Rendered runtime page capture.",
      confidence: page.confidence,
      tags: [...dedupeStrings([...frameworkDetection, ...page.frameworkDetection]), ...page.functionalityToPreserve.slice(0, 2)]
    })
  );

  const assetMap = new Map(manifest.assets.map((asset) => [asset.id, asset]));

  const caseStudies = manifest.pages.flatMap((page, pageIndex) => {
    const focusAnimation = page.animations.find((animation) => animation.functionalImportance !== "decorative");
    const focusAsset = page.assetIds.map((id) => assetMap.get(id)).find((asset) => asset && !looksLikeIcon(asset));
    const notes = [
      ...page.functionalityToPreserve.slice(0, 2),
      ...page.manualReview.slice(0, 1)
    ].filter(Boolean);
    return [
      makeGalleryItem({
        id: `case_study_${pageIndex + 1}`,
        title: `${page.title} case study`,
        kind: "case_study",
        category: "case_studies",
        previewPath: page.screenshots.find((shot) => shot.kind === "full_page")?.localPath ?? page.screenshots[0]?.localPath,
        sourceUrl: page.url,
        pageUrl: page.url,
        assetId: focusAsset?.id,
        animationId: focusAnimation?.id,
        description:
          notes.join(" ") ||
          "Representative preserved layout and motion relationships from the original website.",
        confidence: focusAnimation?.confidence ?? focusAsset?.confidence ?? page.confidence,
        tags: [...dedupeStrings([...frameworkDetection, ...page.frameworkDetection]), ...notes]
      })
    ];
  });

  const icons = manifest.assets
    .filter(looksLikeIcon)
    .map((asset, index) =>
      makeGalleryItem({
        id: `icon_${index + 1}`,
        title: asset.label,
        kind: "icon",
        category: "icons",
        previewPath: asset.localPath,
        localPath: asset.localPath,
        sourceUrl: asset.url,
        assetId: asset.id,
        description: asset.preservationNote,
        confidence: asset.confidence,
        tags: [asset.extractionMode, asset.contentType ?? ""]
      })
    );

  const animations = manifest.pages.flatMap((page) =>
    page.animations.map((animation) =>
      makeGalleryItem({
        id: animation.id,
        title: animation.suggestedAiLabel,
        kind: "animation",
        category: "animations",
        previewPath: page.screenshots.find((shot) => shot.kind === "above_fold")?.localPath,
        pageUrl: page.url,
        sourceUrl: page.url,
        animationId: animation.id,
        description: animation.preservationNote,
        confidence: animation.confidence,
        tags: [animation.type, animation.trigger, animation.likelyFramework]
      })
    )
  );

  const loadingScreens = [
    ...manifest.pages.flatMap((page) =>
      page.animations
        .filter((animation) => animation.suggestedAiLabel.includes("load") || animation.type.includes("entrance"))
        .slice(0, 2)
        .map((animation) =>
          makeGalleryItem({
            id: `${animation.id}_loading`,
            title: `${animation.suggestedAiLabel} loading pattern`,
            kind: "loading_screen",
            category: "loading_screens",
            previewPath: page.screenshots.find((shot) => shot.kind === "above_fold")?.localPath,
            pageUrl: page.url,
            sourceUrl: page.url,
            animationId: animation.id,
            description: animation.fallbackIfRemoved,
            confidence: animation.confidence,
            tags: [animation.type, "loading"]
          })
        )
    ),
    ...manifest.assets.filter(looksLikeLoaderAsset).map((asset) =>
      makeGalleryItem({
        id: `${asset.id}_loading`,
        title: asset.label,
        kind: "loading_screen",
        category: "loading_screens",
        previewPath: asset.localPath,
        localPath: asset.localPath,
        sourceUrl: asset.url,
        assetId: asset.id,
        description: asset.preservationNote,
        confidence: asset.confidence,
        tags: [asset.extractionMode, "loading"]
      })
    )
  ].slice(0, 12);

  const motionProtocols = manifest.pages.flatMap((page) =>
    [
      ...page.animations.map((animation) =>
        makeGalleryItem({
          id: `${animation.id}_protocol`,
          title: `${animation.suggestedAiLabel} motion protocol`,
          kind: "motion_protocol",
          category: "motion_protocols",
          previewPath: page.screenshots.find((shot) => shot.kind === "full_page")?.localPath,
          pageUrl: page.url,
          sourceUrl: page.url,
          animationId: animation.id,
          description: `${animation.observedBehavior} Recreate with ${animation.canRecreateWith.join(", ")}.`,
          confidence: animation.confidence,
          tags: [animation.trigger, animation.functionalImportance, animation.likelyFramework]
        })
      ),
      ...page.interactions.map((interaction) =>
        makeGalleryItem({
          id: `${interaction.id}_protocol`,
          title: `${interaction.label} interaction protocol`,
          kind: "motion_protocol",
          category: "motion_protocols",
          previewPath: page.screenshots.find((shot) => shot.kind === "above_fold")?.localPath,
          pageUrl: page.url,
          sourceUrl: page.url,
          interactionId: interaction.id,
          description: interaction.observedBehavior,
          confidence: interaction.confidence,
          tags: [interaction.type]
        })
      )
    ].slice(0, 10)
  );

  const assets = manifest.assets.map((asset) =>
    makeGalleryItem({
      id: asset.id,
      title: asset.label,
      kind: "asset",
      category: "assets",
      previewPath: asset.localPath.endsWith(".txt") ? undefined : asset.localPath,
      localPath: asset.localPath,
      sourceUrl: asset.url,
      assetId: asset.id,
      description: asset.preservationNote,
      confidence: asset.confidence,
      tags: [asset.extractionMode, asset.contentType ?? ""]
    })
  );

  const metrics: ScraperGalleryMetrics = {
    pages: manifest.pages.length,
    assets: manifest.assets.length,
    animations: animations.length,
    icons: icons.length,
    loadingScreens: loadingScreens.length,
    motionProtocols: motionProtocols.length,
    caseStudies: caseStudies.length,
    confidenceScore: averageConfidence([...manifest.pages, ...manifest.assets]),
    automationCoveragePercent: Math.max(
      50,
      Math.min(
        100,
        Math.round(
          ((manifest.assets.filter((asset) => asset.extractionMode !== "screenshot_inference").length +
            manifest.pages.length) /
            Math.max(manifest.assets.length + manifest.pages.length, 1)) *
            100
        )
      )
    )
  };

  return {
    downloadId: manifest.downloadId,
    sourceUrl: manifest.url,
    title: manifest.pages[0]?.title ?? new URL(manifest.url).hostname,
    createdAt: manifest.finishedAt ?? manifest.startedAt,
    frameworkDetection,
    contacts,
    metrics,
    hosting: buildHostingRecommendation(manifest),
    websites,
    caseStudies,
    icons,
    animations,
    loadingScreens,
    motionProtocols,
    assets
  };
}

async function readStyleSnapshot(handle: ElementHandle<Element>) {
  return handle.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      transform: style.transform,
      opacity: style.opacity,
      color: style.color,
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow
    };
  });
}

async function observeHoverStates(page: Page) {
  const handles = await page.$$("a, button, [role='button']");
  const observations: ScraperInteractionRecord[] = [];

  for (const [index, handle] of handles.entries()) {
    if (observations.length >= 4) break;
    const visible = await handle.isIntersectingViewport().catch(() => false);
    if (!visible) continue;

    const label = await handle
      .evaluate((node) => {
        const text = (node.textContent || "").trim().replace(/\s+/g, " ");
        const aria = node.getAttribute("aria-label") || "";
        return text || aria || node.getAttribute("href") || node.tagName.toLowerCase();
      })
      .catch(() => "");

    const before = await readStyleSnapshot(handle).catch(() => null);
    await handle.hover().catch(() => undefined);
    await sleep(160);
    const after = await readStyleSnapshot(handle).catch(() => null);
    if (!before || !after) continue;

    const changed =
      before.transform !== after.transform ||
      before.opacity !== after.opacity ||
      before.color !== after.color ||
      before.backgroundColor !== after.backgroundColor ||
      before.boxShadow !== after.boxShadow;

    if (!changed) continue;

    observations.push({
      id: `hover_${index + 1}`,
      type: "hover",
      label: sanitizeSlug(label) || `interactive_hover_target_${index + 1}`,
      observedBehavior: "Hover state changes visual styling after runtime render.",
      selector: label,
      confidence: "medium"
    });
  }

  return observations;
}

const RUNTIME_PAGE_ANALYSIS_SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-page-analysis.browser.js"
);

async function collectRuntimePageAnalysis(page: Page, url: string, networkAssetUrls: string[]) {
  await page.addScriptTag({ path: RUNTIME_PAGE_ANALYSIS_SCRIPT });
  const domAnalysis = (await page.evaluate("window.__agentosAnalyzeRuntimePage()")) as Omit<
    RuntimePageAnalysis,
    "networkAssetUrls"
  >;

  const hoverInteractions = await observeHoverStates(page);
  mergeUnique(domAnalysis.interactions, hoverInteractions);

  return {
    ...domAnalysis,
    networkAssetUrls: networkAssetUrls.slice(0, 200)
  } satisfies RuntimePageAnalysis;
}

async function captureScreenshots(job: ScraperJob, page: Page, pageUrl: string) {
  const outputs: ScraperScreenshotRecord[] = [];

  await page.setViewport(DESKTOP_VIEWPORT);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  const aboveFoldPath = screenshotOutputPath(pageUrl, "above_fold");
  const fullPagePath = screenshotOutputPath(pageUrl, "full_page");
  await ensureFileDir(job.outputDir, aboveFoldPath);
  await ensureFileDir(job.outputDir, fullPagePath);
  await page.screenshot({ path: path.join(job.outputDir, aboveFoldPath), type: "png" });
  await page.screenshot({ path: path.join(job.outputDir, fullPagePath), type: "png", fullPage: true });
  outputs.push(
    { kind: "above_fold", localPath: aboveFoldPath, width: DESKTOP_VIEWPORT.width, height: DESKTOP_VIEWPORT.height },
    { kind: "full_page", localPath: fullPagePath, width: DESKTOP_VIEWPORT.width, height: 0 }
  );

  const mobilePage = await page.browser().newPage();
  try {
    await mobilePage.setViewport(MOBILE_VIEWPORT);
    await gotoStable(mobilePage, pageUrl);
    const mobilePath = screenshotOutputPath(pageUrl, "mobile");
    await ensureFileDir(job.outputDir, mobilePath);
    await mobilePage.screenshot({ path: path.join(job.outputDir, mobilePath), type: "png", fullPage: true });
    outputs.push({
      kind: "mobile",
      localPath: mobilePath,
      width: MOBILE_VIEWPORT.width,
      height: MOBILE_VIEWPORT.height
    });
  } finally {
    await mobilePage.close();
  }

  return outputs;
}

async function downloadAsset(job: ScraperJob, candidate: AssetCandidate) {
  if (!candidate.url || candidate.url === "not_directly_available") {
    const placeholder = [
      `Label: ${candidate.labelHint}`,
      `Extraction mode: ${candidate.extractionMode}`,
      `Confidence: ${candidate.confidence}`,
      `Preservation note: ${candidate.preservationNote}`,
      `Rights note: ${candidate.rightsNote}`
    ].join("\n");
    await writeText(job.outputDir, candidate.localPath, placeholder);
    const bytes = Buffer.byteLength(placeholder, "utf8");
    job.totalBytes += bytes;
    return bytes;
  }

  const response = await fetch(candidate.url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeBuffer(job.outputDir, candidate.localPath, buffer);
  job.totalBytes += buffer.length;
  return buffer.length;
}

function phaseWeight(phase: ScraperPhase) {
  switch (phase) {
    case "crawling":
      return 15;
    case "rendering":
      return 30;
    case "assets":
      return 25;
    case "observing":
      return 15;
    case "packaging":
      return 15;
    case "done":
      return 100;
    default:
      return 0;
  }
}

export class WebsiteScraperService {
  private readonly workDir: string;
  private readonly jobs = new Map<string, ScraperJob>();

  constructor(workDir: string) {
    this.workDir = workDir;
  }

  getJob(downloadId: string) {
    return this.jobs.get(downloadId);
  }

  async startDownload(request: ScraperStartRequest) {
    const downloadId = randomUUID();
    const job: ScraperJob = {
      downloadId,
      url: request.url,
      downloadType: request.downloadType ?? "single",
      exportFormats: request.exportFormats?.length ? request.exportFormats : ["zip", "json"],
      maxPages: request.maxPages ?? DEFAULT_MAX_PAGES,
      maxDepth: request.maxDepth ?? DEFAULT_MAX_DEPTH,
      status: "running",
      phase: "crawling",
      progress: 0,
      phaseProgress: 0,
      pagesFound: 0,
      pagesCrawled: 0,
      assetsTotal: 0,
      assetsDownloaded: 0,
      filesDownloaded: 0,
      totalBytes: 0,
      logs: [],
      stopRequested: false,
      startedAt: Date.now(),
      outputDir: path.join(this.workDir, downloadId),
      zipPath: path.join(this.workDir, `${downloadId}.zip`),
      jsonPath: path.join(this.workDir, `${downloadId}.json`),
      csvPath: path.join(this.workDir, `${downloadId}.csv`),
      exportsReady: []
    };

    this.jobs.set(downloadId, job);
    void this.run(job).catch((error: Error) => {
      job.status = "failed";
      job.phase = "failed";
      job.error = error.message;
      this.log(job, "error", error.message);
    });

    return { downloadId };
  }

  private log(job: ScraperJob, level: ScraperLogLevel, message: string) {
    job.logs.push({ level, message, timestamp: new Date().toISOString() });
  }

  private updateProgress(job: ScraperJob) {
    const weights: Record<Exclude<ScraperPhase, "idle" | "done" | "failed" | "stopped">, number> = {
      crawling: 15,
      rendering: 30,
      assets: 25,
      observing: 15,
      packaging: 15
    };

    let progress = 0;
    for (const [phase, weight] of Object.entries(weights) as Array<[keyof typeof weights, number]>) {
      if (job.phase === phase) {
        progress += Math.round((job.phaseProgress / 100) * weight);
        break;
      }
      progress += weight;
    }

    job.progress = job.phase === "done" ? 100 : Math.min(100, progress);
  }

  private async discoverPages(job: ScraperJob, browser: Browser) {
    const origin = new URL(job.url).origin;
    const queue: Array<{ url: string; depth: number }> = [{ url: job.url, depth: 0 }];
    const visited = new Set<string>();
    const pages: Array<{ url: string; depth: number }> = [];

    job.phase = "crawling";
    job.phaseProgress = 0;
    this.updateProgress(job);

    while (queue.length > 0) {
      if (job.stopRequested) break;
      const current = queue.shift();
      if (!current || visited.has(current.url)) continue;
      if (job.downloadType === "single" && visited.size > 0) break;
      if (visited.size >= job.maxPages) break;
      if (current.depth > job.maxDepth) continue;

      const page = await browser.newPage();
      await page.setViewport(DESKTOP_VIEWPORT);

      try {
        this.log(job, "info", `Discovering runtime page ${current.url}`);
        await gotoStable(page, current.url);
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"))
            .map((el) => el.getAttribute("href"))
            .filter((value): value is string => Boolean(value))
        );

        visited.add(current.url);
        pages.push(current);
        job.pagesCrawled = pages.length;
        job.pagesFound = pages.length + queue.length;
        job.phaseProgress = Math.min(100, Math.round((pages.length / Math.max(job.maxPages, 1)) * 100));
        this.updateProgress(job);

        for (const href of links) {
          const absolute = normalizeUrl(href, current.url);
          if (!absolute || !isSameOrigin(absolute, origin) || visited.has(absolute)) continue;
          const pathname = new URL(absolute).pathname;
          const isLikelyPage = !path.extname(pathname) || absolute.endsWith(".html") || absolute.endsWith("/");
          if (isLikelyPage && current.depth < job.maxDepth) {
            queue.push({ url: absolute, depth: current.depth + 1 });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Page discovery failed";
        this.log(job, "warning", `Discovery failed for ${current.url}: ${message}`);
      } finally {
        await page.close();
      }
    }

    return pages;
  }

  private async run(job: ScraperJob) {
    await fs.mkdir(job.outputDir, { recursive: true });
    this.log(job, "info", `Starting rendered runtime capture for ${job.url}`);

    const executablePath = getChromeExecutable();
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const pagesToCapture: ScraperPageRecord[] = [];
    const manifestAssets: ScraperAssetRecord[] = [];
    const assetIndex = new Map<string, ScraperAssetRecord>();
    const frameworkDetection = new Set<string>();
    const directExtraction: string[] = [];
    const screenshotInferences: string[] = [];
    const manualReview: string[] = [];
    const designInspirationOnly: string[] = [];
    const functionalityToPreserve: string[] = [];

    try {
      const discoveredPages = await this.discoverPages(job, browser);

      job.phase = "rendering";
      job.phaseProgress = 0;
      this.updateProgress(job);

      for (const [pageIndex, pageDescriptor] of discoveredPages.entries()) {
        if (job.stopRequested) break;
        const page = await browser.newPage();
        await page.setViewport(DESKTOP_VIEWPORT);

        const networkAssets = new Set<string>();
        const networkScripts = new Set<string>();
        const networkCss = new Set<string>();
        const responseListener = (response: HTTPResponse) => {
          const url = response.url();
          const contentType = (response.headers()["content-type"] || "").toLowerCase();
          if (/image|font|video|audio|svg/.test(contentType)) networkAssets.add(url);
          if (contentType.includes("javascript")) networkScripts.add(url);
          if (contentType.includes("css")) networkCss.add(url);
        };
        page.on("response", responseListener);

        try {
          this.log(job, "info", `Rendering ${pageDescriptor.url}`);
          await gotoStable(page, pageDescriptor.url);

          const html = await page.content();
          const pagePath = htmlOutputPath(pageDescriptor.url);
          await writeText(job.outputDir, pagePath, html);
          job.filesDownloaded += 1;
          job.totalBytes += Buffer.byteLength(html, "utf8");

          const screenshots = await captureScreenshots(job, page, pageDescriptor.url);
          job.filesDownloaded += screenshots.length;

          const analysis = await collectRuntimePageAnalysis(page, pageDescriptor.url, Array.from(networkAssets));

          const pageAssetIds: string[] = [];
          const assetCandidates: AssetCandidate[] = [];

          for (const asset of analysis.assets) {
            const absoluteUrl =
              asset.sourceUrl && asset.sourceUrl !== "not_directly_available"
                ? normalizeUrl(asset.sourceUrl, pageDescriptor.url) ?? asset.sourceUrl
                : asset.sourceUrl;
            const label = inferAssetLabel(asset.kind, asset.labelHint, asset.nearbyText ?? "");
            const localPath =
              absoluteUrl && absoluteUrl !== "not_directly_available"
                ? assetOutputPath(absoluteUrl, asset.contentType)
                : screenshotInferenceOutputPath(pageDescriptor.url, label);

            assetCandidates.push({
              url: absoluteUrl || "not_directly_available",
              localPath,
              extractionMode: absoluteUrl && absoluteUrl !== "not_directly_available" ? asset.extractionMode : "screenshot_inference",
              confidence: asset.confidence,
              contentType: asset.contentType,
              labelHint: label,
              sourceEvidence: emptyEvidence({
                domSelector: asset.selector ?? "",
                visibleTextNearby: asset.nearbyText ?? "",
                screenshotRegion: asset.screenshotRegion ?? "",
                cssReference: asset.cssReference ?? "",
                interactionObserved: asset.interactionObserved ?? ""
              }),
              rightsNote: absoluteUrl && absoluteUrl !== "not_directly_available" ? "unknown" : "unknown",
              preservationNote:
                asset.preservationNote ??
                "Preserve the visual role and placement even if the underlying runtime source is not reusable."
            });
          }

          mergeUnique(analysis.cssReferences, networkCss);
          mergeUnique(analysis.scriptReferences, networkScripts);
          job.assetsTotal += assetCandidates.length;

          job.phase = "assets";
          job.phaseProgress = Math.round(((pageIndex + 1) / Math.max(discoveredPages.length, 1)) * 100);
          this.updateProgress(job);

          for (const candidate of assetCandidates) {
            const assetKey = candidate.url === "not_directly_available" ? `${pageDescriptor.url}:${candidate.localPath}` : candidate.url;
            if (!assetIndex.has(assetKey)) {
              try {
                const bytes = await downloadAsset(job, candidate);
                const record: ScraperAssetRecord = {
                  id: `asset_${assetIndex.size + 1}`,
                  label: candidate.labelHint,
                  url: candidate.url,
                  localPath: candidate.localPath,
                  bytes,
                  extractionMode: candidate.extractionMode,
                  confidence: candidate.confidence,
                  sourceEvidence: candidate.sourceEvidence,
                  rightsNote: candidate.rightsNote,
                  preservationNote: candidate.preservationNote,
                  contentType: candidate.contentType
                };
                assetIndex.set(assetKey, record);
                manifestAssets.push(record);
                job.assetsDownloaded = manifestAssets.length;
                job.filesDownloaded += 1;
              } catch (error) {
                const message = error instanceof Error ? error.message : "Asset capture failed";
                this.log(job, "warning", `Asset capture failed for ${candidate.url}: ${message}`);
              }
            }

            const assetRecord = assetIndex.get(assetKey);
            if (assetRecord) pageAssetIds.push(assetRecord.id);
          }

          job.phase = "observing";
          job.phaseProgress = Math.round(((pageIndex + 1) / Math.max(discoveredPages.length, 1)) * 100);
          this.updateProgress(job);

          mergeUnique(directExtraction, analysis.directExtractionSummary);
          mergeUnique(screenshotInferences, analysis.screenshotInferenceSummary);
          mergeUnique(manualReview, analysis.manualReview);
          mergeUnique(designInspirationOnly, analysis.designInspirationOnly);
          mergeUnique(functionalityToPreserve, analysis.functionalityToPreserve);
          for (const framework of analysis.frameworkDetection) {
            frameworkDetection.add(framework);
          }

          pagesToCapture.push({
            url: pageDescriptor.url,
            title: analysis.title,
            localPath: pagePath,
            depth: pageDescriptor.depth,
            extractionMode: "rendered_runtime",
            confidence: analysis.frameworkDetection.length ? "high" : "medium",
            renderedHtmlPath: pagePath,
            screenshots,
            assetIds: pageAssetIds,
            cssReferences: analysis.cssReferences,
            scriptReferences: analysis.scriptReferences,
            networkAssetUrls: analysis.networkAssetUrls,
            frameworkDetection: analysis.frameworkDetection,
            interactions: analysis.interactions,
            animations: analysis.animations,
            contacts: analysis.contacts,
            directExtractionSummary: analysis.directExtractionSummary,
            screenshotInferenceSummary: analysis.screenshotInferenceSummary,
            manualReview: analysis.manualReview,
            designInspirationOnly: analysis.designInspirationOnly,
            functionalityToPreserve: analysis.functionalityToPreserve
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Rendered capture failed";
          this.log(job, "warning", `Rendered capture failed for ${pageDescriptor.url}: ${message}`);
        } finally {
          page.off("response", responseListener);
          await page.close();
          job.phase = "rendering";
          job.phaseProgress = Math.round(((pageIndex + 1) / Math.max(discoveredPages.length, 1)) * 100);
          this.updateProgress(job);
        }
      }

      job.manifest = {
        downloadId: job.downloadId,
        url: job.url,
        downloadType: job.downloadType,
        extractionMode: "rendered_runtime",
        startedAt: new Date(job.startedAt).toISOString(),
        pages: pagesToCapture,
        assets: manifestAssets,
        totalBytes: job.totalBytes,
        exportFormats: job.exportFormats,
        frameworkDetection: Array.from(frameworkDetection),
        directExtraction,
        screenshotInferences,
        manualReview,
        designInspirationOnly,
        functionalityToPreserve
      };

      const galleryRecord = buildGalleryRecord(job.manifest);
      await fs.writeFile(
        path.join(this.workDir, galleryOutputPath(job.downloadId)),
        JSON.stringify(galleryRecord, null, 2),
        "utf8"
      );

      job.phase = "packaging";
      job.phaseProgress = 0;
      this.updateProgress(job);
      await this.createExports(job);
      job.phaseProgress = 100;
      job.progress = 100;

      if (job.status !== "stopped") {
        job.status = "completed";
        job.phase = "done";
        job.manifest.finishedAt = new Date().toISOString();
        this.log(job, "info", "Rendered runtime capture completed successfully");
      }
    } finally {
      await browser.close();
      job.finishedAt = Date.now();
      if (job.stopRequested && job.status === "running") {
        job.status = "stopped";
        job.phase = "stopped";
        this.log(job, "warning", "Capture stopped by operator");
      }
    }
  }

  private async createExports(job: ScraperJob) {
    const ready: ScraperExportFormat[] = [];

    if (job.exportFormats.includes("json") && job.manifest) {
      await fs.writeFile(job.jsonPath, JSON.stringify(job.manifest, null, 2), "utf8");
      ready.push("json");
      this.log(job, "info", "JSON manifest exported");
    }

    if (job.exportFormats.includes("csv") && job.manifest) {
      const rows = [
        [
          "recordType",
          "id",
          "label",
          "url",
          "localPath",
          "bytes",
          "extractionMode",
          "confidence",
          "frameworkDetection",
          "preservationNote"
        ],
        ...job.manifest.pages.map((page) => [
          "page",
          pageSlug(page.url),
          page.title,
          page.url,
          page.renderedHtmlPath,
          "",
          page.extractionMode,
          page.confidence,
          page.frameworkDetection.join("; "),
          page.functionalityToPreserve.join(" | ")
        ]),
        ...job.manifest.assets.map((asset) => [
          "asset",
          asset.id,
          asset.label,
          asset.url,
          asset.localPath,
          String(asset.bytes),
          asset.extractionMode,
          asset.confidence,
          "",
          asset.preservationNote
        ])
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      await fs.writeFile(job.csvPath, csv, "utf8");
      ready.push("csv");
      this.log(job, "info", "CSV evidence inventory exported");
    }

    if (job.exportFormats.includes("zip")) {
      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(job.zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", () => resolve());
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(job.outputDir, false);
        if (job.exportFormats.includes("json") && existsSync(job.jsonPath)) {
          archive.file(job.jsonPath, { name: "manifest.json" });
        }
        if (job.exportFormats.includes("csv") && existsSync(job.csvPath)) {
          archive.file(job.csvPath, { name: "evidence.csv" });
        }
        archive.finalize();
      });
      ready.push("zip");
      this.log(job, "info", "ZIP evidence bundle exported");
    }

    job.exportsReady = ready;
    job.phaseProgress = 100;
    this.updateProgress(job);
  }

  getStatus(downloadId: string): ScraperStatus | null {
    const job = this.jobs.get(downloadId);
    if (!job) return null;

    const elapsed = Date.now() - job.startedAt;
    const eta =
      job.progress > 0 && job.status === "running"
        ? `${Math.max(1, Math.round(((elapsed / Math.max(job.progress, 1)) * (100 - job.progress)) / 1000))}s remaining`
        : null;

    return {
      downloadId: job.downloadId,
      url: job.url,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      phaseProgress: job.phaseProgress,
      pagesFound: job.pagesFound,
      pagesCrawled: job.pagesCrawled,
      assetsTotal: job.assetsTotal,
      assetsDownloaded: job.assetsDownloaded,
      filesDownloaded: job.filesDownloaded,
      totalSize: formatBytes(job.totalBytes),
      eta,
      error: job.error ?? null,
      exportFormats: job.exportFormats,
      exportsReady: job.exportsReady
    };
  }

  getLogs(downloadId: string) {
    const job = this.jobs.get(downloadId);
    if (!job) return null;
    return { logs: job.logs };
  }

  stop(downloadId: string) {
    const job = this.jobs.get(downloadId);
    if (!job) return false;
    job.stopRequested = true;
    return true;
  }

  getExportPath(downloadId: string, format: ScraperExportFormat) {
    const job = this.jobs.get(downloadId);
    if (!job || !job.exportsReady.includes(format)) return null;
    if (format === "zip") return job.zipPath;
    if (format === "json") return job.jsonPath;
    if (format === "csv") return job.csvPath;
    return null;
  }

  async listGallery(): Promise<ScraperGalleryIndexEntry[]> {
    const files = await fs.readdir(this.workDir).catch(() => []);
    const entries: ScraperGalleryIndexEntry[] = [];

    for (const file of files.filter((name) => name.endsWith(".json") && !name.endsWith(".gallery.json"))) {
      try {
        const downloadId = file.replace(/\.json$/, "");
        const parsed = await this.getGallery(downloadId);
        if (!parsed) continue;
        const previewPath = parsed.websites[0]?.previewPath;
        entries.push({
          downloadId: parsed.downloadId,
          title: parsed.title,
          sourceUrl: parsed.sourceUrl,
          createdAt: parsed.createdAt,
          ...(previewPath ? { previewPath } : {}),
          frameworkDetection: parsed.frameworkDetection,
          metrics: parsed.metrics,
          hosting: parsed.hosting
        });
      } catch {
        // skip corrupt gallery files
      }
    }

    return entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getGallery(downloadId: string): Promise<ScraperGalleryRecord | null> {
    try {
      const content = await fs.readFile(path.join(this.workDir, `${downloadId}.json`), "utf8");
      const manifest = JSON.parse(content) as ScraperManifest;
      const gallery = buildGalleryRecord(manifest);
      await fs.writeFile(path.join(this.workDir, galleryOutputPath(downloadId)), JSON.stringify(gallery, null, 2), "utf8");
      return gallery;
    } catch {
      try {
        const content = await fs.readFile(path.join(this.workDir, galleryOutputPath(downloadId)), "utf8");
        return JSON.parse(content) as ScraperGalleryRecord;
      } catch {
        return null;
      }
    }
  }

  getJobAssetFilePath(downloadId: string, localPath: string) {
    if (!looksSafeRelativePath(localPath)) return null;
    const job = this.jobs.get(downloadId);
    const jobDir = job?.outputDir ?? path.join(this.workDir, downloadId);
    const resolved = path.resolve(jobDir, localPath);
    const base = path.resolve(jobDir);
    if (!resolved.startsWith(base)) return null;
    return resolved;
  }

  getMimeTypeForFile(localPath: string) {
    return mimeTypeForPath(localPath);
  }
}

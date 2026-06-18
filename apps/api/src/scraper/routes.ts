import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { WebsiteScraperService } from "./downloader.js";
import type { ScraperExportFormat, ScraperGalleryRecord, ScraperStartRequest } from "./types.js";
import { validateScraperUrl } from "./url-policy.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const workDir = path.join(moduleDir, "..", "..", "data", "scraper");

await fs.mkdir(workDir, { recursive: true });

const scraper = new WebsiteScraperService(workDir);

const EXPORT_NAMES: Record<ScraperExportFormat, string> = {
  zip: "rendered-runtime-bundle.zip",
  json: "manifest.json",
  csv: "evidence.csv"
};

function isExportFormat(value: string): value is ScraperExportFormat {
  return value === "zip" || value === "json" || value === "csv";
}

/** Scraper route auth classes: docs/architecture/api-auth-matrix.md */
export async function registerScraperRoutes(app: FastifyInstance) {
  app.post<{ Body: ScraperStartRequest }>("/scraper/download", async (request, reply) => {
    const body = request.body ?? {};
    if (!body.url) {
      return reply.status(400).send({ error: "URL is required" });
    }

    const urlDecision = validateScraperUrl(body.url);
    if (!urlDecision.ok) {
      return reply.status(403).send({ error: urlDecision.reason });
    }

    const exportFormats = (body.exportFormats ?? ["zip"]).filter(isExportFormat);
    const result = await scraper.startDownload({
      url: body.url,
      downloadType: body.downloadType,
      exportFormats: exportFormats.length ? exportFormats : ["zip"],
      maxPages: body.maxPages,
      maxDepth: body.maxDepth
    });

    return result;
  });

  app.get<{ Params: { downloadId: string } }>("/scraper/status/:downloadId", async (request, reply) => {
    const status = scraper.getStatus(request.params.downloadId);
    if (!status) return reply.status(404).send({ error: "Scrape job not found" });
    return status;
  });

  app.get<{ Params: { downloadId: string } }>("/scraper/logs/:downloadId", async (request, reply) => {
    const logs = scraper.getLogs(request.params.downloadId);
    if (!logs) return reply.status(404).send({ error: "Scrape job not found" });
    return logs;
  });

  app.get("/scraper/gallery", async () => {
    const items = await scraper.listGallery();
    return { items };
  });

  app.get<{ Params: { downloadId: string } }>("/scraper/gallery/:downloadId", async (request, reply) => {
    const gallery = await scraper.getGallery(request.params.downloadId);
    if (!gallery) return reply.status(404).send({ error: "Gallery record not found" });
    return gallery satisfies ScraperGalleryRecord;
  });

  app.get<{ Params: { downloadId: string }; Querystring: { path?: string } }>(
    "/scraper/file/:downloadId",
    async (request, reply) => {
      const localPath = request.query.path;
      if (!localPath) return reply.status(400).send({ error: "path query parameter is required" });
      const filePath = scraper.getJobAssetFilePath(request.params.downloadId, localPath);
      if (!filePath || !existsSync(filePath)) {
        return reply.status(404).send({ error: "Captured file not found" });
      }
      const buffer = await fs.readFile(filePath);
      return reply.header("Content-Type", scraper.getMimeTypeForFile(localPath)).send(buffer);
    }
  );

  app.post<{ Params: { downloadId: string } }>("/scraper/stop/:downloadId", async (request, reply) => {
    const stopped = scraper.stop(request.params.downloadId);
    if (!stopped) return reply.status(404).send({ error: "Scrape job not found" });
    return { success: true };
  });

  app.get<{ Params: { downloadId: string; format: string } }>(
    "/scraper/export/:downloadId/:format",
    async (request, reply) => {
      const { downloadId, format } = request.params;
      if (!isExportFormat(format)) {
        return reply.status(400).send({ error: "Unsupported export format" });
      }

      const filePath = scraper.getExportPath(downloadId, format);
      if (!filePath || !existsSync(filePath)) {
        return reply.status(404).send({ error: "Export not ready" });
      }

      const buffer = await fs.readFile(filePath);
      const mime =
        format === "zip"
          ? "application/zip"
          : format === "json"
            ? "application/json"
            : "text/csv";

      return reply
        .header("Content-Type", mime)
        .header("Content-Disposition", `attachment; filename="${EXPORT_NAMES[format]}"`)
        .send(buffer);
    }
  );
}

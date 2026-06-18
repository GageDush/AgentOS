# Open Design to Flous Design Lab

Source reviewed: `nexu-io/open-design` at `076bf3316fb6dfa79bf00acd84c9dff2f07de5cd`

License posture: Open Design is Apache-2.0. AgentOS can adapt concepts and, if needed, small implementation patterns with attribution and license notices. The safer path is to rebuild the experience using AgentOS primitives instead of copying their monorepo or daemon model.

## What To Reverse Engineer

Open Design is strongest as a local-first design workspace. The parts worth turning into a Flous.dev component are the workflow seams:

- Design project intake: URL, local folder, uploaded HTML, screenshots, design-system files, and generated artifacts.
- File and asset rail: grouped pages, source files, screenshots, icons, animations, and metadata with status badges.
- Sandboxed preview stage: generated or captured HTML rendered in an iframe with view switching, reload, fullscreen, and export actions.
- Design context panel: brief, constraints, source URL, implementation notes, and handoff prompt.
- Comment and review loop: visual comments tied to an artifact, page, selector, screenshot, or preview state.
- Export handoff: self-contained HTML, Drive upload, Claude Design prompt, zip when needed, mission artifact link.

## What Not To Import

Do not import the whole Open Design app, daemon, registry, or plugin runtime into AgentOS.

Reasons:

- The dependency shape is different from AgentOS and would turn a focused component into a second platform.
- Their state model is built around their desktop daemon and project router.
- AgentOS already has missions, approvals, scraper output, local control, generated app preview, and wiki/docs surfaces.
- Flous.dev should keep the AgentOS product language instead of inheriting another app's nouns.

## Flous Component

Component name: `DesignLabWorkbench`

Suggested route: `/design-lab`

Primary job: turn scraped websites, uploaded HTML, and generated design docs into a reviewable design project with a live preview and handoff exports.

Layout:

- Left rail: project files, source pages, screenshots, assets, icons, motion references, raw captures, derived artifacts.
- Center stage: sandboxed preview for original composition, generated HTML, gallery view, or screenshot comparison.
- Right inspector: selected asset metadata, source URL, dimensions, file size, animation notes, contact/source notes, and linked design documentation.
- Bottom activity strip: ingestion status, compression metrics, scrape efficiency, host/export status, and recent handoff actions.

Modes:

- `Original`: shows the captured website composition as self-contained HTML.
- `Gallery`: shows all extracted assets grouped by type and source.
- `Case Study`: shows notable assets with usage notes, movement protocol, and implementation hints.
- `Handoff`: shows `design.md`, wireframe, Claude prompt, export actions, and Drive status.

## AgentOS Integration

The Design Lab should sit on top of existing AgentOS concepts:

- Scraper results become design projects.
- Mission artifacts can be opened in the Design Lab.
- Generated previews should reuse or extend `GeneratedAppFrame`.
- Approval gates apply before publishing, uploading, or running external scripts.
- Quota Steward chooses deterministic processing first: local parsing, image compression, metadata extraction, then LLM summarization only for case-study copy or naming cleanup.
- Wiki entries can index final design docs, but raw scrape assets should remain project artifacts.

## Data Shape

```ts
type DesignLabProject = {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceHost?: string;
  createdAt: string;
  updatedAt: string;
  status: "ingesting" | "ready" | "needs-review" | "exported" | "failed";
  metrics: DesignLabMetrics;
  artifacts: DesignLabArtifact[];
};

type DesignLabArtifact = {
  id: string;
  projectId: string;
  kind:
    | "page"
    | "html"
    | "screenshot"
    | "image"
    | "icon"
    | "animation"
    | "video"
    | "font"
    | "design-doc"
    | "wireframe"
    | "prompt"
    | "raw";
  title: string;
  path: string;
  sourceUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  tags: string[];
  notes?: string;
};

type DesignLabMetrics = {
  assetCount: number;
  originalBytes: number;
  optimizedBytes: number;
  compressionRatio?: number;
  pageCount: number;
  screenshotCount: number;
  hostFit: "local" | "drive" | "static-host" | "needs-trimming";
};
```

## API Surface

First-pass local API:

- `GET /design-lab/projects`
- `POST /design-lab/projects/from-scrape`
- `GET /design-lab/projects/:projectId`
- `GET /design-lab/projects/:projectId/artifacts`
- `GET /design-lab/projects/:projectId/preview`
- `POST /design-lab/projects/:projectId/export/html`
- `POST /design-lab/projects/:projectId/export/drive`

The first implementation can be backed by local files and the existing scraper output. A later pass can move persistence behind the shared repository layer.

## Security Rules

- Render external captures in a sandboxed iframe.
- Prefer `srcDoc` for generated previews and strip local absolute paths before export.
- Never expose secrets, `.env` contents, cookies, or browser session data in project artifacts.
- Treat third-party scripts as inert unless the user explicitly chooses rendered runtime capture.
- Keep Drive upload and publish actions behind explicit approval events.
- Store attribution and source URLs with each asset.

## Implementation Slices

1. Add `DesignLabWorkbench` with static sample data from the latest dashboard scrape folder.
2. Reuse or wrap `GeneratedAppFrame` as `SandboxedArtifactPreview`.
3. Add a project file rail and artifact inspector.
4. Connect the scraper output folder to the project model.
5. Add self-contained HTML export and size metrics.
6. Add Drive handoff status once the local export path is stable.

## Product Naming

Use normal product language:

- Design Lab
- Asset Gallery
- Source Capture
- Preview Stage
- Handoff
- Review Notes
- Export
- Project Files
- Case Study

Avoid names that make the dashboard feel like a secret operations board.

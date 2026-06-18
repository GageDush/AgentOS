/**
 * Auto-populate IcePanel diagrams from the landscape model via REST API.
 * MCP cannot create/layout diagrams; this script uses PUT diagram upsert.
 *
 * Requires: ICEPANEL_API_KEY, ICEPANEL_LANDSCAPE_ID (optional, has default)
 * Run: pnpm icepanel:populate-diagrams
 */

import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const API_BASE = "https://api.icepanel.io/v1";
const DEFAULT_LANDSCAPE_ID = "j6f0TMmnvqS5ka7D2O27";
const DEFAULT_CONTEXT_DIAGRAM_ID = "epq3Q0nOsO8SIfiTOiHR";

function loadEnv() {
  const path = existsSync(".env") ? ".env" : ".env.example";
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function id(prefix) {
  return `${prefix}-${randomBytes(6).toString("hex")}`;
}

const SIZE = {
  actor: { width: 170, height: 90 },
  system: { width: 240, height: 150 },
  app: { width: 190, height: 100 },
  store: { width: 180, height: 95 },
  component: { width: 170, height: 88 }
};

const DIAGRAM_SPECS = [
  {
    key: "context",
    name: "AgentOS Context",
    type: "context-diagram",
    diagramId: process.env.ICEPANEL_CONTEXT_DIAGRAM_ID ?? DEFAULT_CONTEXT_DIAGRAM_ID,
    parentModelName: null,
    placements: [
      { name: "Operator", x: 80, y: 320 },
      { name: "AgentOS", x: 420, y: 300 },
      { name: "Cloudflare Tunnel", x: 820, y: 80 },
      { name: "Discord", x: 820, y: 220 },
      { name: "Cursor IDE", x: 820, y: 360 },
      { name: "Ollama", x: 820, y: 500 },
      { name: "GitHub", x: 820, y: 640 }
    ]
  },
  {
    key: "app",
    name: "AgentOS Containers",
    type: "app-diagram",
    parentModelName: "AgentOS",
    placements: [
      { name: "Operator", x: 60, y: 40 },
      { name: "Cloudflare Tunnel", x: 60, y: 180 },
      { name: "Command Center", x: 320, y: 40 },
      { name: "API", x: 320, y: 200 },
      { name: "Gateway", x: 320, y: 360 },
      { name: "Worker", x: 320, y: 500 },
      { name: "Scheduler", x: 320, y: 640 },
      { name: "agentos-local.db", x: 620, y: 120 },
      { name: "Memory Wiki", x: 620, y: 260 },
      { name: "Agent Profiles", x: 620, y: 400 },
      { name: "Repo Filesystem", x: 620, y: 540 },
      { name: "Discord", x: 920, y: 80 },
      { name: "Cursor IDE", x: 920, y: 220 },
      { name: "Ollama", x: 920, y: 360 },
      { name: "GitHub", x: 920, y: 500 }
    ]
  },
  {
    key: "api-components",
    name: "API Components",
    type: "component-diagram",
    parentModelName: "API",
    placements: [
      { name: "Auth Module", x: 80, y: 80 },
      { name: "Mission Runtime", x: 320, y: 80 },
      { name: "Wiki API", x: 560, y: 80 },
      { name: "Discord Bridge", x: 80, y: 260 },
      { name: "Events WS", x: 320, y: 260 },
      { name: "Worker Trigger", x: 560, y: 260 },
      { name: "Command Center", x: 200, y: 460 },
      { name: "Worker", x: 440, y: 460 },
      { name: "Gateway", x: 680, y: 460 }
    ]
  },
  {
    key: "command-center-components",
    name: "Command Center Components",
    type: "component-diagram",
    parentModelName: "Command Center",
    placements: [
      { name: "Forge Shell", x: 100, y: 100 },
      { name: "Dashboard Home", x: 360, y: 100 },
      { name: "Memory Wiki View", x: 620, y: 100 },
      { name: "Control Gate View", x: 360, y: 300 },
      { name: "API", x: 360, y: 500 }
    ]
  }
];

async function api(apiKey, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function listAll(apiKey, landscapeId, resource) {
  const items = [];
  let cursor;
  do {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("cursor", cursor);
    const page = await api(apiKey, "GET", `/landscapes/${landscapeId}/versions/latest/model/${resource}?${qs}`);
    const batch = page?.modelObjects ?? page?.modelConnections ?? page?.items ?? page?.data ?? [];
    if (Array.isArray(page)) {
      items.push(...page);
      break;
    }
    items.push(...(Array.isArray(batch) ? batch : []));
    cursor = page?.nextCursor;
  } while (cursor);
  return items;
}

async function listDiagrams(apiKey, landscapeId) {
  const res = await api(apiKey, "GET", `/landscapes/${landscapeId}/versions/latest/diagrams`);
  if (Array.isArray(res)) return res;
  return res?.diagrams ?? res?.items ?? [];
}

async function createDiagram(apiKey, landscapeId, { name, type, modelId }) {
  const res = await api(apiKey, "POST", `/landscapes/${landscapeId}/versions/latest/diagrams`, {
    name,
    type,
    modelId,
    index: 1
  });
  return res.diagram ?? res;
}

function buildDiagramObjects(placements, objectsByName) {
  const diagramObjects = {};
  const modelToDiagram = {};

  for (const place of placements) {
    const model = objectsByName.get(place.name);
    if (!model) {
      console.warn(`  skip missing model object: ${place.name}`);
      continue;
    }
    const diagramObjectId = id("obj");
    const size = SIZE[model.type] ?? SIZE.app;
    diagramObjects[diagramObjectId] = {
      id: diagramObjectId,
      modelId: model.id,
      type: model.type,
      shape: "box",
      x: place.x,
      y: place.y,
      width: size.width,
      height: size.height
    };
    modelToDiagram[model.id] = diagramObjectId;
  }

  return { diagramObjects, modelToDiagram };
}

function buildDiagramConnections(connections, modelToDiagram) {
  const diagramConnections = {};

  for (const conn of connections) {
    const originId = modelToDiagram[conn.originId];
    const targetId = modelToDiagram[conn.targetId];
    if (!originId || !targetId) continue;

    const diagramConnectionId = id("conn");
    diagramConnections[diagramConnectionId] = {
      id: diagramConnectionId,
      modelId: conn.id,
      originId,
      targetId,
      originConnector: "right-middle",
      targetConnector: "left-middle",
      lineShape: "curved",
      labelPosition: 50,
      points: []
    };
  }

  return diagramConnections;
}

async function getDiagramContent(apiKey, landscapeId, diagramId) {
  const res = await api(apiKey, "GET", `/landscapes/${landscapeId}/versions/latest/diagrams/${diagramId}/content`);
  return res.diagramContent;
}

async function deleteDiagram(apiKey, landscapeId, diagramId) {
  return api(apiKey, "DELETE", `/landscapes/${landscapeId}/versions/latest/diagrams/${diagramId}`);
}

async function upsertDiagramContent(apiKey, landscapeId, diagramId, { diagramObjects, diagramConnections }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const content = await getDiagramContent(apiKey, landscapeId, diagramId);
    const existingObjectIds = Object.keys(content.objects ?? {});
    const existingConnectionIds = Object.keys(content.connections ?? {});
    const hasExisting = existingObjectIds.length > 0 || existingConnectionIds.length > 0;

    const payload = {
      ...(hasExisting ? { commit: content.version } : {}),
      objects: {
        ...(existingObjectIds.length ? { $remove: existingObjectIds } : {}),
        $add: diagramObjects
      },
      connections: {
        ...(existingConnectionIds.length ? { $remove: existingConnectionIds } : {}),
        $add: diagramConnections
      }
    };

    try {
      return await api(
        apiKey,
        "PATCH",
        `/landscapes/${landscapeId}/versions/latest/diagrams/${diagramId}/content`,
        payload
      );
    } catch (err) {
      if (attempt < 4 && String(err.message).includes("409")) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}

async function populateDiagram(apiKey, landscapeId, spec, objectsByName, connections) {
  console.log(`\n→ ${spec.name} (${spec.type})`);

  const parent = spec.parentModelName ? objectsByName.get(spec.parentModelName) : null;
  let diagramId = spec.diagramId;

  if (!diagramId) {
    const existing = (await listDiagrams(apiKey, landscapeId)).find(
      (d) => d.name === spec.name && d.type === spec.type
    );
    if (existing) {
      diagramId = existing.id;
      console.log(`  using existing diagram ${diagramId}`);
    }
  }

  const { diagramObjects, modelToDiagram } = buildDiagramObjects(spec.placements, objectsByName);
  const diagramConnections = buildDiagramConnections(connections, modelToDiagram);
  const objectCount = Object.keys(diagramObjects).length;
  const connectionCount = Object.keys(diagramConnections).length;

  const apply = async (targetId) => {
    await upsertDiagramContent(apiKey, landscapeId, targetId, { diagramObjects, diagramConnections });
    return targetId;
  };

  try {
    if (!diagramId) {
      const created = await createDiagram(apiKey, landscapeId, {
        name: spec.name,
        type: spec.type,
        modelId: parent?.id ?? objectsByName.get("AgentOS")?.id
      });
      diagramId = created.id;
      console.log(`  created diagram ${diagramId}`);
    }

    diagramId = await apply(diagramId);
  } catch (err) {
    if (String(err.message).includes("409") && diagramId) {
      console.warn(`  conflict on ${diagramId}, recreating diagram...`);
      await deleteDiagram(apiKey, landscapeId, diagramId);
      const created = await createDiagram(apiKey, landscapeId, {
        name: spec.name,
        type: spec.type,
        modelId: parent?.id ?? objectsByName.get("AgentOS")?.id
      });
      diagramId = created.id;
      console.log(`  recreated diagram ${diagramId}`);
      diagramId = await apply(diagramId);
    } else {
      throw err;
    }
  }

  console.log(`  placed ${objectCount} objects, ${connectionCount} connections`);
  return { diagramId, objectCount, connectionCount };
}

async function main() {
  const fileEnv = loadEnv();
  const apiKey = process.env.ICEPANEL_API_KEY ?? fileEnv.ICEPANEL_API_KEY;
  const landscapeId = process.env.ICEPANEL_LANDSCAPE_ID ?? fileEnv.ICEPANEL_LANDSCAPE_ID ?? DEFAULT_LANDSCAPE_ID;

  if (!apiKey || apiKey === "your-icepanel-api-key") {
    console.error(`
IcePanel diagram auto-populate needs a REST API key (MCP OAuth cannot layout diagrams).

1. IcePanel → Org Settings → API keys → Create (read + write)
2. Add to .env:
   ICEPANEL_API_KEY=your_key_here
   ICEPANEL_LANDSCAPE_ID=${DEFAULT_LANDSCAPE_ID}
3. Run: pnpm icepanel:populate-diagrams

Docs: https://developer.icepanel.io/api-reference/diagrams/upsert
`);
    process.exit(1);
  }

  console.log(`Landscape: ${landscapeId}`);

  const [objects, connections] = await Promise.all([
    listAll(apiKey, landscapeId, "objects"),
    listAll(apiKey, landscapeId, "connections")
  ]);

  if (!objects.length) {
    throw new Error("No model objects found. Import the model first (MCP or landscape import).");
  }

  const objectsByName = new Map(objects.map((o) => [o.name, o]));
  console.log(`Model: ${objects.length} objects, ${connections.length} connections`);

  const results = [];
  for (const spec of DIAGRAM_SPECS) {
    results.push(await populateDiagram(apiKey, landscapeId, spec, objectsByName, connections));
  }

  console.log("\nDone. Open IcePanel:");
  console.log(`  https://app.icepanel.io/landscapes/${landscapeId}/versions/latest/overview`);
  for (const r of results) {
    console.log(`  - ${r.objectCount} objects, ${r.connectionCount} connections on diagram ${r.diagramId}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

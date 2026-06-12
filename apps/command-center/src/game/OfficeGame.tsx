"use client";

import { useEffect, useRef } from "react";
import { officeInteractables, type OfficeAgentVisual } from "@agentos/game-schema";
import { demoMissionVisualSteps, officeAgentRoster } from "../demo-office/legacyAgents";
import { emitOfficeInteraction } from "./eventBus";

type TilePoint = {
  x: number;
  y: number;
};

type WorldPoint = {
  x: number;
  y: number;
};

type TileStation = {
  id: string;
  targetId: string;
  label: string;
  role: string;
  tile: TilePoint;
  approach: TilePoint;
  agentId?: string;
  agentTile?: TilePoint;
  facing: "left" | "right" | "up" | "down";
  width: number;
  height: number;
  color: number;
};

type AgentVisual = {
  profile: OfficeAgentVisual;
  station: TileStation;
  container: any;
  sprite: any;
  bubble: any;
  selected: any;
  chipBg: any;
  chipText: any;
  frameIndex: number;
  mode: OfficeAgentVisual["mode"];
};

type AssistantVisual = {
  id: string;
  currentTile: TilePoint;
  container: any;
  sprite: any;
  paper: any;
  chipBg: any;
  chipText: any;
  frameIndex: number;
  busy: boolean;
};

const TILE = 32;
const COLS = 40;
const ROWS = 27;
const OFFICE_W = COLS * TILE;
const OFFICE_H = ROWS * TILE;

const interactableById = new Map(officeInteractables.map((target) => [target.id, target]));

const tileStations: TileStation[] = [
  {
    id: "product-agent-desk",
    targetId: "product-agent",
    label: "Product",
    role: "Strategy desk",
    tile: { x: 6, y: 6 },
    approach: { x: 8, y: 8 },
    agentId: "product-agent",
    agentTile: { x: 7, y: 6 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x356d78
  },
  {
    id: "builder-agent-desk",
    targetId: "builder-agent",
    label: "Builder",
    role: "Implementation desk",
    tile: { x: 10, y: 13 },
    approach: { x: 13, y: 15 },
    agentId: "builder-agent",
    agentTile: { x: 12, y: 13 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x2f6aa2
  },
  {
    id: "qa-agent-desk",
    targetId: "qa-agent",
    label: "QA",
    role: "Verification desk",
    tile: { x: 27, y: 13 },
    approach: { x: 26, y: 15 },
    agentId: "qa-agent",
    agentTile: { x: 28, y: 13 },
    facing: "left",
    width: 3,
    height: 2,
    color: 0x38795c
  },
  {
    id: "security-agent-desk",
    targetId: "security-agent",
    label: "Security",
    role: "Approval desk",
    tile: { x: 31, y: 6 },
    approach: { x: 30, y: 8 },
    agentId: "security-agent",
    agentTile: { x: 32, y: 6 },
    facing: "left",
    width: 3,
    height: 2,
    color: 0x8a5c3b
  },
  {
    id: "operator-command-ring",
    targetId: "agentos-operator",
    label: "Operator",
    role: "Command hub",
    tile: { x: 18, y: 15 },
    approach: { x: 20, y: 17 },
    agentId: "agentos-operator",
    agentTile: { x: 20, y: 15 },
    facing: "down",
    width: 4,
    height: 2,
    color: 0x4a4d9a
  },
  {
    id: "mission-board",
    targetId: "mission-board",
    label: "Mission Board",
    role: "Mission planning",
    tile: { x: 18, y: 4 },
    approach: { x: 20, y: 7 },
    facing: "up",
    width: 4,
    height: 1,
    color: 0x6258a8
  },
  {
    id: "task-pipeline",
    targetId: "task-pipeline-board",
    label: "Tasks",
    role: "Task pipeline",
    tile: { x: 3, y: 9 },
    approach: { x: 7, y: 10 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x5f3547
  },
  {
    id: "security-gates",
    targetId: "security-station",
    label: "Approvals",
    role: "Risk gates",
    tile: { x: 33, y: 10 },
    approach: { x: 31, y: 11 },
    facing: "left",
    width: 3,
    height: 2,
    color: 0x854f44
  },
  {
    id: "local-ai-console",
    targetId: "local-ai-console",
    label: "Local AI",
    role: "Prompt console",
    tile: { x: 18, y: 22 },
    approach: { x: 20, y: 21 },
    facing: "down",
    width: 4,
    height: 2,
    color: 0x1e7990
  },
  {
    id: "memory-browser",
    targetId: "knowledge-memory-station",
    label: "Memory",
    role: "Knowledge archive",
    tile: { x: 4, y: 20 },
    approach: { x: 8, y: 21 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x536b43
  },
  {
    id: "discord-comms",
    targetId: "discord-comms-station",
    label: "Comms",
    role: "Discord surface",
    tile: { x: 3, y: 15 },
    approach: { x: 7, y: 16 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x345d8a
  },
  {
    id: "token-credit-manager",
    targetId: "finance-token-station",
    label: "Budget",
    role: "Token manager",
    tile: { x: 32, y: 20 },
    approach: { x: 31, y: 21 },
    facing: "left",
    width: 4,
    height: 2,
    color: 0x777337
  },
  {
    id: "devops-station",
    targetId: "devops-station",
    label: "DevOps",
    role: "Runtime health",
    tile: { x: 9, y: 20 },
    approach: { x: 12, y: 21 },
    facing: "right",
    width: 3,
    height: 2,
    color: 0x47626f
  },
  {
    id: "logs-station",
    targetId: "qa-station",
    label: "Logs",
    role: "Audit log",
    tile: { x: 25, y: 20 },
    approach: { x: 24, y: 21 },
    facing: "left",
    width: 3,
    height: 2,
    color: 0x654a80
  },
  {
    id: "settings-terminal",
    targetId: "settings-terminal",
    label: "Settings",
    role: "Flags",
    tile: { x: 18, y: 19 },
    approach: { x: 20, y: 18 },
    facing: "down",
    width: 4,
    height: 1,
    color: 0x4a6074
  },
  {
    id: "system-status",
    targetId: "system-status-panel",
    label: "Status",
    role: "System health",
    tile: { x: 23, y: 4 },
    approach: { x: 23, y: 7 },
    facing: "up",
    width: 3,
    height: 1,
    color: 0x4e7c78
  },
  {
    id: "server-rack",
    targetId: "server-rack",
    label: "Server",
    role: "Gateway rack",
    tile: { x: 35, y: 14 },
    approach: { x: 33, y: 15 },
    facing: "left",
    width: 2,
    height: 3,
    color: 0x33424f
  }
];

const stationById = new Map(tileStations.map((station) => [station.id, station]));
const stationByTarget = new Map(tileStations.map((station) => [station.targetId, station]));
const stationByAgent = new Map(tileStations.filter((station) => station.agentId).map((station) => [station.agentId ?? "", station]));

const demoStationByAgent: Record<string, string> = {
  "product-agent": "mission-board",
  "builder-agent": "local-ai-console",
  "qa-agent": "logs-station",
  "security-agent": "security-gates",
  "agentos-operator": "operator-command-ring"
};

function tileKey(tile: TilePoint) {
  return `${tile.x},${tile.y}`;
}

function sameTile(a: TilePoint, b: TilePoint) {
  return a.x === b.x && a.y === b.y;
}

function tileToWorld(tile: TilePoint): WorldPoint {
  return {
    x: tile.x * TILE + TILE / 2,
    y: tile.y * TILE + TILE / 2
  };
}

function moodTexture(mode: OfficeAgentVisual["mode"]) {
  return mode === "blocked" ? "warning-triangle" : "typing-bubble";
}

function statusTexture(mode: OfficeAgentVisual["mode"]) {
  if (mode === "blocked") return "status-offline";
  if (mode === "working" || mode === "reviewing") return "status-busy";
  return "status-online";
}

export function OfficeGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let destroyed = false;
    let game: any;

    const boot = async () => {
      const Phaser = await import("phaser");
      if (destroyed || !containerRef.current) return;

      class OfficeScene extends Phaser.Scene {
        private blocked = new Set<string>();

        private debugTiles: any[] = [];

        private stationVisuals = new Map<string, { station: TileStation; glow: any; dot: any; label: any; debug: any }>();

        private agentVisuals = new Map<string, AgentVisual>();

        private assistants: AssistantVisual[] = [];

        private selectedTargetId?: string;

        private debugVisible = false;

        private ambientPausedUntil = 0;

        constructor() {
          super("TileOfficeScene");
        }

        preload() {
          this.load.image("status-online", "/assets/executive/vfx/status_dot_online.png");
          this.load.image("status-busy", "/assets/executive/vfx/status_dot_busy.png");
          this.load.image("status-offline", "/assets/executive/vfx/status_dot_offline.png");
          this.load.image("typing-bubble", "/assets/executive/vfx/vfx_typing_bubble.png");
          this.load.image("warning-triangle", "/assets/executive/vfx/vfx_warning_triangle.png");
          this.load.image("selected-ring", "/assets/executive/vfx/vfx_selected_glow_ring.png");
          this.load.image("shadow-ellipse", "/assets/executive/vfx/vfx_shadow_ellipse.png");

          for (let index = 1; index <= 4; index += 1) {
            this.load.image(`executive-idle-${index}`, `/assets/executive/movement/executive_idle_front_0${index}.png`);
            this.load.image(`executive-side-${index}`, `/assets/executive/movement/executive_idle_side_0${index}.png`);
            this.load.image(`executive-walk-${index}`, `/assets/executive/movement/executive_walk_down_0${index}.png`);
          }
        }

        create() {
          this.cameras.main.setBackgroundColor("#081017");

          this.drawFloor();
          this.drawWallsAndRooms();
          this.reserveBlockedTiles();
          this.drawRoomSetDressing();
          this.drawStations(Phaser);
          this.drawAgents(Phaser);
          this.drawAssistants(Phaser);
          this.drawHeader();
          this.installEvents();
          this.scheduleAmbientDeliveries();
        }

        private drawHeader() {
          this.add.text(20, 16, "AgentOS Command Center", {
            color: "#f5fbff",
            fontFamily: "Georgia",
            fontSize: "24px",
            backgroundColor: "rgba(5, 9, 14, 0.58)",
            padding: { x: 10, y: 7 }
          }).setDepth(4000);
          this.add.text(20, 55, "Live ops floor. Agents stay at desks while assistants route through halls and stairs. Press D for path/debug tiles.", {
            color: "#c9d7e8",
            fontFamily: "Verdana",
            fontSize: "12px",
            backgroundColor: "rgba(5, 9, 14, 0.42)",
            padding: { x: 8, y: 4 }
          }).setDepth(4000);
        }

        private drawFloor() {
          this.add.rectangle(OFFICE_W / 2, OFFICE_H / 2, OFFICE_W, OFFICE_H, 0x081017, 1).setDepth(0);
          this.add.rectangle(OFFICE_W / 2, OFFICE_H / 2, OFFICE_W, OFFICE_H, 0x03060a, 0.46).setDepth(0.5);
          const roomTints = [
            { x: 2, y: 3, w: 12, h: 8, color: 0x102638, accent: 0x31d6ff },
            { x: 26, y: 3, w: 12, h: 8, color: 0x1f2232, accent: 0xff8a5c },
            { x: 2, y: 13, w: 13, h: 11, color: 0x0e282a, accent: 0x7aa7ff },
            { x: 25, y: 13, w: 13, h: 11, color: 0x22243a, accent: 0xb184ff },
            { x: 15, y: 3, w: 10, h: 21, color: 0x151d2d, accent: 0x46f0d0 }
          ];
          roomTints.forEach((room) => {
            const cx = room.x * TILE + (room.w * TILE) / 2;
            const cy = room.y * TILE + (room.h * TILE) / 2;
            const w = room.w * TILE;
            const h = room.h * TILE;
            this.add.rectangle(cx + 8, cy + 12, w + 8, h + 10, 0x020509, 0.34).setDepth(0.8);
            this.add.rectangle(cx, cy, w, h, room.color, 0.76).setStrokeStyle(1, room.accent, 0.12).setDepth(1);
            this.add.rectangle(cx, room.y * TILE + 9, w - 18, 4, room.accent, 0.12).setDepth(2);
            this.add.rectangle(cx, room.y * TILE + h - 10, w - 24, 3, 0x03070d, 0.36).setDepth(2);
            this.drawRoomRug(room.x + 1, room.y + 2, room.w - 2, room.h - 3, room.accent);
          });

          for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
              const hallway = x >= 16 && x <= 23 || y >= 11 && y <= 12 || y >= 18 && y <= 19;
              const color = hallway ? (x + y) % 2 ? 0x273647 : 0x223141 : (x + y) % 2 ? 0x101a25 : 0x0d1721;
              this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color, hallway ? 0.72 : 0.22).setDepth(2);
              if ((x * 11 + y * 7) % 19 === 0) {
                this.add.rectangle(x * TILE + 9, y * TILE + 9, 2, 2, hallway ? 0x5a7890 : 0x355065, 0.18).setDepth(3);
              }
              if (hallway && (x + y) % 5 === 0) {
                this.add.rectangle(x * TILE + TILE - 5, y * TILE + 4, 2, 11, 0x5b7087, 0.2).setDepth(3);
              }
            }
          }

          this.add.ellipse(20 * TILE + 16, 16 * TILE + 14, 252, 126, 0x255b7c, 0.28).setDepth(3);
          this.add.ellipse(20 * TILE + 16, 16 * TILE + 14, 176, 84, 0x44d7ff, 0.16).setDepth(4);
          this.add.ellipse(20 * TILE + 16, 16 * TILE + 10, 82, 38, 0x55e7ff, 0.15).setDepth(6);
          this.add.rectangle(20 * TILE + 16, 16 * TILE + 62, 196, 3, 0x20d2ff, 0.36).setDepth(5);
          this.add.rectangle(20 * TILE + 16, 16 * TILE - 42, 196, 3, 0x8f63ff, 0.28).setDepth(5);
          this.drawDataCables();
        }

        private drawRoomRug(tileX: number, tileY: number, width: number, height: number, accent: number) {
          const x = tileX * TILE;
          const y = tileY * TILE;
          const w = width * TILE;
          const h = height * TILE;
          this.add.rectangle(x + w / 2, y + h / 2, w - 18, h - 20, 0x050b12, 0.18).setDepth(1.5);
          this.add.rectangle(x + w / 2, y + h / 2, w - 44, h - 48, accent, 0.035).setStrokeStyle(1, accent, 0.11).setDepth(2.5);
        }

        private drawDataCables() {
          const cables = [
            [{ x: 8, y: 8 }, { x: 8, y: 11 }, { x: 16, y: 11 }, { x: 20, y: 16 }],
            [{ x: 32, y: 8 }, { x: 31, y: 11 }, { x: 23, y: 11 }, { x: 20, y: 16 }],
            [{ x: 7, y: 16 }, { x: 14, y: 18 }, { x: 20, y: 18 }],
            [{ x: 31, y: 21 }, { x: 25, y: 18 }, { x: 20, y: 18 }]
          ];

          cables.forEach((route, index) => {
            for (let step = 1; step < route.length; step += 1) {
              const from = tileToWorld(route[step - 1]);
              const to = tileToWorld(route[step]);
              this.add.line(0, 0, from.x, from.y, to.x, to.y, index % 2 ? 0x8f63ff : 0x35d7ff, 0.12).setLineWidth(2).setDepth(4);
            }
          });
        }

        private drawWallsAndRooms() {
          this.markRect(0, 0, COLS, 1);
          this.markRect(0, ROWS - 1, COLS, 1);
          this.markRect(0, 0, 1, ROWS);
          this.markRect(COLS - 1, 0, 1, ROWS);

          this.drawWallRect(0, 0, COLS, 1);
          this.drawWallRect(0, ROWS - 1, COLS, 1);
          this.drawWallRect(0, 0, 1, ROWS);
          this.drawWallRect(COLS - 1, 0, 1, ROWS);

          const dividers = [
            { x: 14, y: 3, w: 1, h: 8, doors: [{ x: 14, y: 11 }] },
            { x: 25, y: 3, w: 1, h: 8, doors: [{ x: 25, y: 11 }] },
            { x: 14, y: 13, w: 1, h: 11, doors: [{ x: 14, y: 18 }] },
            { x: 25, y: 13, w: 1, h: 11, doors: [{ x: 25, y: 18 }] },
            { x: 2, y: 11, w: 12, h: 1, doors: [{ x: 8, y: 11 }] },
            { x: 26, y: 11, w: 12, h: 1, doors: [{ x: 31, y: 11 }] }
          ];

          dividers.forEach((wall) => {
            this.drawDividerWithDoors(wall.x, wall.y, wall.w, wall.h, wall.doors);
          });

          this.drawStair({ x: 15, y: 11 }, { x: 16, y: 14 });
          this.drawStair({ x: 24, y: 11 }, { x: 23, y: 14 });
        }

        private drawRoomSetDressing() {
          this.drawNeonSign(6, 3, "PRODUCT", 0x31d6ff);
          this.drawNeonSign(31, 3, "SECURITY", 0xff8a5c);
          this.drawNeonSign(5, 12, "COMMS", 0x7aa7ff);
          this.drawNeonSign(29, 12, "QA / LOGS", 0xb184ff);
          this.drawNeonSign(18, 2, "AGENTOS HQ", 0x46f0d0);
          this.drawNeonSign(32, 19, "FINANCE", 0xe5de6b);
          this.drawWallMonitorBank(3, 4, 4, 0x31d6ff);
          this.drawWallMonitorBank(30, 4, 5, 0xff8a5c);
          this.drawWallMonitorBank(4, 14, 4, 0x7aa7ff);
          this.drawWallMonitorBank(29, 14, 4, 0xb184ff);
          this.drawWallMonitorBank(17, 4, 6, 0x46f0d0);
          this.drawCeilingLight(20, 12, 0x46f0d0);
          this.drawCeilingLight(8, 13, 0x7aa7ff);
          this.drawCeilingLight(31, 13, 0xb184ff);

          [
            { x: 3, y: 5 },
            { x: 12, y: 8 },
            { x: 27, y: 8 },
            { x: 36, y: 5 },
            { x: 4, y: 23 },
            { x: 35, y: 23 },
            { x: 17, y: 7 },
            { x: 23, y: 7 }
          ].forEach((tile) => this.drawPlant(tile.x, tile.y));

          for (let rack = 0; rack < 4; rack += 1) {
            this.drawServerRack(35 + (rack % 2), 14 + Math.floor(rack / 2) * 2);
          }

          this.drawMissionPillar(20, 9);
          this.drawMiniHudPanel(2, 1, "SYSTEM STATUS", ["ALL SYSTEMS GO", "AGENTS ONLINE", "ROUTES ACTIVE"], 0x50e3a4);
          this.drawMiniHudPanel(33, 1, "TASK PIPELINE", ["BACKLOG 112", "IN PROGRESS 342", "REVIEW 78"], 0xb184ff);
        }

        private drawWallMonitorBank(tileX: number, tileY: number, count: number, accent: number) {
          const startX = tileX * TILE;
          const y = tileY * TILE;
          for (let index = 0; index < count; index += 1) {
            const x = startX + index * 28;
            this.add.rectangle(x + 12, y + 14, 24, 18, 0x050912, 0.92).setStrokeStyle(1, 0x465e7a, 0.56).setDepth(y + 30);
            this.add.rectangle(x + 12, y + 13, 18, 10, accent, 0.22 + (index % 2) * 0.12).setDepth(y + 31);
            this.add.rectangle(x + 12, y + 23, 10, 2, 0xffffff, 0.16).setDepth(y + 32);
          }
        }

        private drawCeilingLight(tileX: number, tileY: number, accent: number) {
          const point = tileToWorld({ x: tileX, y: tileY });
          this.add.ellipse(point.x, point.y + 52, 210, 96, accent, 0.055).setDepth(3);
          this.add.rectangle(point.x, point.y, 92, 4, accent, 0.38).setDepth(16);
          this.tweens.add({
            targets: this.add.rectangle(point.x, point.y + 1, 82, 2, 0xffffff, 0.26).setDepth(17),
            alpha: 0.48,
            duration: 1700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }

        private drawNeonSign(tileX: number, tileY: number, text: string, color: number) {
          const x = tileX * TILE;
          const y = tileY * TILE;
          const width = Math.max(88, text.length * 10 + 18);
          this.add.rectangle(x + width / 2, y + 12, width, 24, 0x060914, 0.88).setStrokeStyle(2, color, 0.55).setDepth(y + 34);
          this.add.rectangle(x + width / 2, y + 27, width - 8, 2, color, 0.5).setDepth(y + 35);
          this.add.text(x + 8, y + 4, text, {
            color: `#${color.toString(16).padStart(6, "0")}`,
            fontFamily: "Verdana",
            fontSize: "10px",
            fontStyle: "bold"
          }).setDepth(y + 36);
        }

        private drawPlant(tileX: number, tileY: number) {
          const p = tileToWorld({ x: tileX, y: tileY });
          this.add.ellipse(p.x, p.y + 12, 22, 10, 0x020509, 0.28).setDepth(p.y + 6);
          this.add.rectangle(p.x, p.y + 9, 12, 14, 0x5d4a35, 1).setStrokeStyle(1, 0x9a7a4d, 0.45).setDepth(p.y + 8);
          this.add.triangle(p.x - 6, p.y + 2, 0, 16, 10, 2, 18, 18, 0x4bc46b, 0.84).setDepth(p.y + 9);
          this.add.triangle(p.x + 5, p.y, 0, 18, 11, 0, 20, 17, 0x2fae76, 0.8).setDepth(p.y + 10);
          this.add.triangle(p.x, p.y - 4, 0, 18, 10, 0, 20, 18, 0x37e08c, 0.62).setDepth(p.y + 11);
        }

        private drawServerRack(tileX: number, tileY: number) {
          const x = tileX * TILE;
          const y = tileY * TILE;
          this.add.rectangle(x + 16, y + 28, 24, 54, 0x0a101b, 1).setStrokeStyle(2, 0x48617a, 0.72).setDepth(y + 80);
          for (let row = 0; row < 5; row += 1) {
            this.add.rectangle(x + 16, y + 8 + row * 9, 16, 2, row % 2 ? 0x3ad0ff : 0x7c5cff, 0.82).setDepth(y + 82);
            this.add.circle(x + 25, y + 8 + row * 9, 1.5, 0x50e3a4, 0.88).setDepth(y + 83);
          }
        }

        private drawMissionPillar(tileX: number, tileY: number) {
          const x = tileX * TILE + 16;
          const y = tileY * TILE + 16;
          this.add.rectangle(x, y + 10, 74, 112, 0x08101d, 0.96).setStrokeStyle(2, 0x5c7cff, 0.58).setDepth(y + 120);
          this.add.rectangle(x, y - 28, 58, 38, 0x0b2342, 0.92).setStrokeStyle(1, 0x35d7ff, 0.7).setDepth(y + 121);
          this.add.text(x - 25, y - 40, "MISSION", {
            color: "#35d7ff",
            fontFamily: "Verdana",
            fontSize: "8px",
            fontStyle: "bold"
          }).setDepth(y + 123);
          this.add.rectangle(x, y + 14, 48, 3, 0x50e3a4, 0.72).setDepth(y + 123);
          this.add.rectangle(x, y + 30, 42, 3, 0x8f63ff, 0.72).setDepth(y + 123);
          this.add.rectangle(x, y + 46, 34, 3, 0xffc857, 0.72).setDepth(y + 123);
          this.tweens.add({
            targets: this.add.ellipse(x, y - 4, 58, 26, 0x35d7ff, 0.16).setDepth(y + 122),
            alpha: 0.34,
            scaleX: 1.08,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }

        private drawMiniHudPanel(tileX: number, tileY: number, title: string, rows: string[], accent: number) {
          const x = tileX * TILE;
          const y = tileY * TILE;
          const w = 190;
          const h = 106;
          this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x070b18, 0.9).setStrokeStyle(2, 0x384f7a, 0.7).setDepth(3600);
          this.add.text(x + 12, y + 10, title, {
            color: `#${accent.toString(16).padStart(6, "0")}`,
            fontFamily: "Verdana",
            fontSize: "10px",
            fontStyle: "bold"
          }).setDepth(3601);
          rows.forEach((row, index) => {
            this.add.circle(x + 14, y + 36 + index * 20, 3, index === 0 ? 0x50e3a4 : accent, 0.92).setDepth(3601);
            this.add.text(x + 24, y + 29 + index * 20, row, {
              color: "#d5e4f8",
              fontFamily: "Verdana",
              fontSize: "8px"
            }).setDepth(3601);
          });
        }

        private drawStair(top: TilePoint, bottom: TilePoint) {
          const topWorld = tileToWorld(top);
          const bottomWorld = tileToWorld(bottom);
          this.add.line(0, 0, topWorld.x, topWorld.y, bottomWorld.x, bottomWorld.y, 0x8ca1ad, 0.48).setLineWidth(8).setDepth(8);
          for (let index = 0; index < 4; index += 1) {
            this.add.line(
              0,
              0,
              topWorld.x + index * 4,
              topWorld.y + index * 20,
              topWorld.x + 34 + index * 4,
              topWorld.y + index * 20,
              0xb7c6cf,
              0.32
            ).setLineWidth(2).setDepth(9);
          }
        }

        private reserveBlockedTiles() {
          tileStations.forEach((station) => {
            this.markRect(station.tile.x, station.tile.y, station.width, station.height);
            this.unblockTile(station.approach);
            if (station.agentTile) this.unblockTile(station.agentTile);
          });
          this.drawDebugTiles();
        }

        private drawStations(Phaser: any) {
          tileStations.forEach((station) => {
            const target = interactableById.get(station.targetId);
            const x = station.tile.x * TILE;
            const y = station.tile.y * TILE;
            const w = station.width * TILE;
            const h = station.height * TILE;
            const depth = y + h + 30;
            const accent = station.id.includes("security")
              ? 0xff735d
              : station.id.includes("qa") || station.id.includes("logs")
                ? 0xb184ff
                : station.id.includes("token") || station.id.includes("finance")
                  ? 0xf0df65
                  : station.id.includes("local-ai") || station.id.includes("operator")
                    ? 0x35d7ff
                    : 0x50e3a4;

            const shadow = this.add.rectangle(x + w / 2 + 6, y + h / 2 + 12, w + 18, h + 18, 0x020509, 0.5).setDepth(depth - 8);
            const underGlow = this.add.rectangle(x + w / 2, y + h / 2 + 5, w + 18, h + 14, accent, 0.13).setDepth(depth - 7);
            const side = this.add.rectangle(x + w / 2, y + h - 5, w - 4, 20, 0x0a0d14, 0.92).setDepth(depth + 4);
            side.setStrokeStyle(1, 0x162338, 0.86);
            const surface = this.add.rectangle(x + w / 2, y + h / 2 - 3, w - 8, h - 13, station.color, 0.96).setDepth(depth);
            surface.setStrokeStyle(2, accent, 0.28);
            this.add.rectangle(x + w / 2, y + 7, w - 18, 5, 0xffffff, 0.15).setDepth(depth + 1);
            this.add.rectangle(x + w / 2, y + h - 16, w - 18, 3, accent, 0.3).setDepth(depth + 10);
            this.add.rectangle(x + 12, y + h - 6, 8, 12, 0x6a4b2c, 0.62).setDepth(depth + 12);
            this.add.rectangle(x + w - 12, y + h - 6, 8, 12, 0x6a4b2c, 0.62).setDepth(depth + 12);
            const monitor = this.add.rectangle(x + w / 2, y + 13, Math.max(28, w * 0.42), 10, accent, 0.42).setDepth(depth + 6);
            const glow = this.add.rectangle(x + w / 2, y + h / 2, w + 16, h + 18, 0x3ad0ff, 0).setDepth(depth - 6);
            const dot = this.add.image(x + w - 12, y + 12, "status-online").setScale(0.13).setDepth(depth + 10);
            this.drawStationGear(station, x, y, w, h, depth);
            const label = this.add.text(x + 4, y + h + 2, station.label, {
              color: "#dceeff",
              fontFamily: "Verdana",
              fontSize: "9px",
              backgroundColor: "rgba(4, 9, 13, 0.68)",
              padding: { x: 4, y: 2 }
            }).setDepth(depth + 12).setAlpha(0);
            const debug = this.add.text(x, y - 18, `${station.id} ${station.approach.x},${station.approach.y}`, {
              color: "#8fffe7",
              fontFamily: "Verdana",
              fontSize: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              padding: { x: 4, y: 2 }
            }).setDepth(5000).setVisible(false);

            this.tweens.add({
              targets: [monitor, dot, underGlow],
              alpha: 0.74,
              duration: 1500 + station.tile.x * 20,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut"
            });

            const zone = this.add.zone(x + w / 2, y + h / 2, w + TILE, h + TILE).setInteractive({ useHandCursor: true });
            zone.on("pointerover", () => {
              glow.setAlpha(0.16);
              label.setAlpha(0.96);
              this.input.setDefaultCursor("pointer");
            });
            zone.on("pointerout", () => {
              if (this.selectedTargetId !== station.targetId) {
                glow.setAlpha(0);
                label.setAlpha(this.debugVisible ? 0.84 : 0);
              }
              this.input.setDefaultCursor("default");
            });
            zone.on("pointerdown", () => {
              this.selectStation(station.id);
              if (target) emitOfficeInteraction(target);
            });

            this.stationVisuals.set(station.id, { station, glow, dot, label, debug });
            shadow.setData("stationId", station.id);
          });
        }

        private drawStationGear(station: TileStation, x: number, y: number, w: number, h: number, depth: number) {
          const accent = station.id.includes("security")
            ? 0xff735d
            : station.id.includes("qa") || station.id.includes("logs")
              ? 0xb184ff
              : station.id.includes("token") || station.id.includes("finance")
                ? 0xf0df65
                : station.id.includes("local-ai") || station.id.includes("operator")
                  ? 0x35d7ff
                  : 0x50e3a4;

          const monitorCount = Math.max(1, Math.min(3, Math.floor(w / 38)));
          for (let index = 0; index < monitorCount; index += 1) {
            const mx = x + w / 2 + (index - (monitorCount - 1) / 2) * 24;
            const my = y + 13 + (index % 2) * 3;
            this.add.rectangle(mx + 2, my + 3, 22, 15, 0x020509, 0.36).setDepth(depth + 10);
            this.add.rectangle(mx, my, 22, 15, 0x06101a, 1).setStrokeStyle(1, 0x6f84ff, 0.72).setDepth(depth + 11);
            this.add.rectangle(mx, my, 15, 8, accent, 0.58).setDepth(depth + 12);
            this.add.rectangle(mx - 4, my - 3, 5, 2, 0xffffff, 0.18).setDepth(depth + 13);
            this.add.rectangle(mx, my + 10, 2, 5, 0x38465e, 1).setDepth(depth + 12);
          }

          for (let index = 0; index < 3; index += 1) {
            this.add.rectangle(x + 16 + index * 10, y + h - 22, 6, 2, index % 2 ? 0x8f63ff : 0x35d7ff, 0.72).setDepth(depth + 12);
          }

          this.add.rectangle(x + w - 22, y + h - 23, 17, 10, 0x0a1118, 0.9).setStrokeStyle(1, accent, 0.42).setDepth(depth + 12);
          this.add.circle(x + w - 10, y + h - 25, 3, 0x50e3a4, 0.85).setDepth(depth + 13);
          this.add.rectangle(x + w - 38, y + h - 18, 10, 7, 0xf0e0b8, 0.9).setStrokeStyle(1, 0x6f5b34, 0.4).setDepth(depth + 13);
          this.add.circle(x + w - 46, y + h - 21, 4, 0x26394d, 0.98).setStrokeStyle(1, accent, 0.42).setDepth(depth + 13);
          this.add.circle(x + w - 46, y + h - 23, 2, 0x9defff, 0.52).setDepth(depth + 14);
          this.add.rectangle(x + 22, y + h - 14, 20, 3, 0xf3f0d6, 0.58).setDepth(depth + 13);
          this.add.rectangle(x + 26, y + h - 10, 16, 3, 0x8dbbff, 0.45).setDepth(depth + 13);

          if (station.agentId) {
            const chairX = station.facing === "left" ? x + w - 22 : station.facing === "right" ? x + 22 : x + w / 2;
            const chairY = y + h + 3;
            this.add.ellipse(chairX, chairY + 8, 28, 12, 0x020509, 0.28).setDepth(depth - 3);
            this.add.rectangle(chairX, chairY, 27, 22, 0x101620, 0.96).setStrokeStyle(1, 0x56708d, 0.64).setDepth(depth - 2);
            this.add.rectangle(chairX, chairY + 12, 20, 6, 0x05080d, 0.88).setDepth(depth - 1);
            this.add.rectangle(chairX, chairY - 11, 23, 4, accent, 0.24).setDepth(depth - 1);
          }

          if (station.id.includes("memory") || station.id.includes("devops")) {
            this.add.rectangle(x + 10, y + h - 34, 12, 18, 0x6b5a3b, 0.95).setStrokeStyle(1, 0xc9a75b, 0.35).setDepth(depth + 13);
            this.add.rectangle(x + 10, y + h - 39, 10, 4, 0xdbc17b, 0.82).setDepth(depth + 14);
          }

          if (station.id.includes("mission") || station.id.includes("settings")) {
            this.add.rectangle(x + w / 2, y + h - 27, w - 28, 3, accent, 0.68).setDepth(depth + 13);
            this.add.rectangle(x + w / 2, y + h - 34, w - 40, 3, 0xffffff, 0.22).setDepth(depth + 13);
          }
        }

        private drawAgents(Phaser: any) {
          officeAgentRoster.forEach((profile, index) => {
            const station = stationByAgent.get(profile.agentId);
            if (!station?.agentTile) return;
            const point = tileToWorld(station.agentTile);
            const target = interactableById.get(profile.agentId);

            const shadow = this.add.image(0, 16, "shadow-ellipse").setScale(0.16).setAlpha(0.28);
            const selected = this.add.image(0, 10, "selected-ring").setScale(0.21).setAlpha(0);
            const sprite = this.add
              .image(0, -2, `executive-idle-${(index % 4) + 1}`)
              .setScale(0.14)
              .setAlpha(0.96)
              .setTint(profile.tint);
            const bubble = this.add
              .image(18, -43, moodTexture(profile.mode))
              .setScale(0.22)
              .setAlpha(profile.mode === "idle" ? 0.18 : 0.72);
            const chipBg = this.add.rectangle(0, 38, 78, 16, 0x061014, 0.82).setStrokeStyle(1, 0x2de0c2, 0.3).setAlpha(0);
            const chipText = this.add.text(-36, 32, profile.statusText, {
              color: "#d5fff6",
              fontFamily: "Verdana",
              fontSize: "8px"
            }).setAlpha(0);
            const deskGlow = this.add.rectangle(0, 21, 30, 4, 0x46f0d0, 0.2);

            const container = this.add.container(point.x, point.y, [shadow, selected, sprite, deskGlow, bubble, chipBg, chipText]);
            container.setDepth(station.tile.y * TILE + station.height * TILE + 58);
            container.setSize(44, 70);
            container.setInteractive(new Phaser.Geom.Rectangle(-22, -48, 44, 78), Phaser.Geom.Rectangle.Contains);
            container.on("pointerover", () => {
              selected.setAlpha(0.34);
              chipBg.setAlpha(0.84);
              chipText.setAlpha(0.94);
              this.input.setDefaultCursor("pointer");
            });
            container.on("pointerout", () => {
              selected.setAlpha(this.selectedTargetId === profile.agentId ? 0.42 : 0);
              chipBg.setAlpha(this.debugVisible ? 0.72 : 0);
              chipText.setAlpha(this.debugVisible ? 0.94 : 0);
              this.input.setDefaultCursor("default");
            });
            container.on("pointerdown", () => {
              this.selectStation(station.id);
              if (target) emitOfficeInteraction(target);
            });

            this.tweens.add({
              targets: [bubble],
              y: -47,
              alpha: Math.max(0.24, bubble.alpha * 0.82),
              duration: 1200 + index * 80,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut"
            });

            this.agentVisuals.set(profile.agentId, {
              profile,
              station,
              container,
              sprite,
              bubble,
              selected,
              chipBg,
              chipText,
              frameIndex: index % 4,
              mode: profile.mode
            });
          });
        }

        private drawAssistants(Phaser: any) {
          const starts = [
            { id: "assistant-1", tile: { x: 20, y: 17 }, tint: 0xd8eaff },
            { id: "assistant-2", tile: { x: 17, y: 18 }, tint: 0xffe0a6 }
          ];

          starts.forEach((start, index) => {
            const point = tileToWorld(start.tile);
            const shadow = this.add.image(0, 13, "shadow-ellipse").setScale(0.12).setAlpha(0.24);
            const sprite = this.add.image(0, -2, `executive-walk-${index + 1}`).setScale(0.1).setAlpha(0.92).setTint(start.tint);
            const paper = this.add.rectangle(10, -13, 9, 6, 0xf4e9c9, 0.96).setStrokeStyle(1, 0x6f5b34, 0.48).setAlpha(0);
            const chipBg = this.add.rectangle(0, 26, 56, 13, 0x061014, 0.72).setStrokeStyle(1, 0x8dbbff, 0.2).setAlpha(0);
            const chipText = this.add.text(-24, 20, "paperwork", {
              color: "#e8f2ff",
              fontFamily: "Verdana",
              fontSize: "7px"
            }).setAlpha(0);
            const container = this.add.container(point.x, point.y, [shadow, sprite, paper, chipBg, chipText]);
            container.setDepth(point.y + 12);

            this.assistants.push({
              id: start.id,
              currentTile: start.tile,
              container,
              sprite,
              paper,
              chipBg,
              chipText,
              frameIndex: index,
              busy: false
            });
          });
        }

        private installEvents() {
          this.time.addEvent({
            delay: 180,
            loop: true,
            callback: () => this.tickFrames()
          });

          this.input.keyboard?.on("keydown-D", () => {
            this.debugVisible = !this.debugVisible;
            this.debugTiles.forEach((tile) => tile.setVisible(this.debugVisible));
            this.stationVisuals.forEach((visual) => {
              visual.debug.setVisible(this.debugVisible);
              visual.label.setAlpha(this.debugVisible || this.selectedTargetId === visual.station.targetId ? 0.9 : 0);
            });
            this.agentVisuals.forEach((agent) => {
              agent.chipBg.setAlpha(this.debugVisible ? 0.72 : 0);
              agent.chipText.setAlpha(this.debugVisible ? 0.94 : 0);
            });
          });

          window.addEventListener("agentos:panel-opened", this.onPanelOpened as EventListener);
          window.addEventListener("agentos:demo-mission-run", this.onDemoMissionRun as EventListener);
          this.events.once("shutdown", () => {
            window.removeEventListener("agentos:panel-opened", this.onPanelOpened as EventListener);
            window.removeEventListener("agentos:demo-mission-run", this.onDemoMissionRun as EventListener);
          });
        }

        private tickFrames() {
          this.agentVisuals.forEach((agent) => {
            agent.frameIndex = (agent.frameIndex + 1) % 4;
            const frame = agent.frameIndex + 1;
            const base = agent.station.facing === "left" || agent.station.facing === "right" ? "executive-side" : "executive-idle";
            agent.sprite.setTexture(`${base}-${frame}`);
            agent.sprite.setFlipX(agent.station.facing === "left");
          });
          this.assistants.forEach((assistant) => {
            assistant.frameIndex = (assistant.frameIndex + 1) % 4;
            assistant.sprite.setTexture(`executive-walk-${assistant.frameIndex + 1}`);
          });
        }

        private selectStation(stationId: string) {
          const station = stationById.get(stationId);
          if (!station) return;
          this.selectedTargetId = station.targetId;

          this.stationVisuals.forEach((visual) => {
            const selected = visual.station.id === stationId || visual.station.targetId === station.targetId;
            visual.glow.setAlpha(selected ? 0.22 : 0);
            visual.label.setAlpha(selected || this.debugVisible ? 0.92 : 0);
            visual.dot.setTexture(selected ? "status-busy" : "status-online");
          });

          this.agentVisuals.forEach((agent) => {
            const selected = agent.profile.agentId === station.agentId || agent.station.id === stationId;
            agent.selected.setAlpha(selected ? 0.42 : 0);
          });
        }

        private setAgentMode(agentId: string, mode: OfficeAgentVisual["mode"], statusText: string) {
          const agent = this.agentVisuals.get(agentId);
          if (!agent) return;
          agent.mode = mode;
          agent.bubble.setTexture(moodTexture(mode)).setAlpha(mode === "idle" ? 0 : 0.62);
          agent.chipText.setText(statusText);
          agent.chipBg.setSize(Math.max(70, statusText.length * 5), 15);
          this.stationVisuals.get(agent.station.id)?.dot.setTexture(statusTexture(mode));
        }

        private scheduleAmbientDeliveries() {
          const deliveries = [
            ["product-agent-desk", "mission-board", "brief"],
            ["mission-board", "builder-agent-desk", "spec"],
            ["builder-agent-desk", "qa-agent-desk", "build"],
            ["qa-agent-desk", "security-gates", "evidence"],
            ["security-agent-desk", "operator-command-ring", "approval"],
            ["operator-command-ring", "memory-browser", "notes"],
            ["token-credit-manager", "security-agent-desk", "budget"],
            ["discord-comms", "operator-command-ring", "status"]
          ];
          this.time.addEvent({
            delay: 9000,
            loop: true,
            callback: () => {
              if (this.time.now < this.ambientPausedUntil) return;
              const delivery = deliveries[Math.floor(Math.random() * deliveries.length)];
              this.dispatchAssistant(delivery[0], delivery[1], delivery[2]);
            }
          });
        }

        private dispatchAssistant(fromStationId: string, toStationId: string, label: string, delay = 0) {
          const assistant = this.assistants.find((item) => !item.busy) ?? this.assistants[0];
          const from = stationById.get(fromStationId);
          const to = stationById.get(toStationId);
          if (!assistant || !from || !to) return;

          const toPickup = sameTile(assistant.currentTile, from.approach) ? [from.approach] : this.findPath(assistant.currentTile, from.approach);
          const toDropoff = this.findPath(from.approach, to.approach);
          const route = [...toPickup, ...toDropoff.slice(1)];
          if (route.length < 2) return;

          assistant.busy = true;
          assistant.paper.setAlpha(0);
          assistant.chipText.setText(label);
          assistant.chipBg.setSize(Math.max(56, label.length * 6), 13);
          assistant.chipBg.setAlpha(0.78);
          assistant.chipText.setAlpha(0.96);
          this.stationVisuals.get(to.id)?.dot.setTexture("status-busy");
          this.moveAssistantAlong(assistant, route, 1, delay, from.approach, to.id);
        }

        private moveAssistantAlong(
          assistant: AssistantVisual,
          route: TilePoint[],
          index: number,
          delay: number,
          pickupTile: TilePoint,
          destinationStationId: string
        ) {
          const tile = route[index];
          const previous = route[index - 1];
          if (!tile || !previous) {
            assistant.busy = false;
            assistant.paper.setAlpha(0);
            assistant.chipBg.setAlpha(0);
            assistant.chipText.setAlpha(0);
            this.stationVisuals.get(destinationStationId)?.dot.setTexture("status-online");
            return;
          }

          const point = tileToWorld(tile);
          this.tweens.add({
            targets: assistant.container,
            x: point.x,
            y: point.y,
            delay,
            duration: 560,
            ease: "Linear",
            onStart: () => {
              assistant.sprite.setFlipX(tile.x < previous.x);
              if (sameTile(tile, pickupTile)) assistant.paper.setAlpha(0.96);
            },
            onUpdate: () => {
              assistant.container.setDepth(assistant.container.y + 12);
            },
            onComplete: () => {
              assistant.currentTile = tile;
              this.moveAssistantAlong(assistant, route, index + 1, 0, pickupTile, destinationStationId);
            }
          });
        }

        private runDemoMissionSequence() {
          this.ambientPausedUntil = this.time.now + 12000;
          const plan = [
            ["product-agent-desk", "mission-board", "brief"],
            ["mission-board", "builder-agent-desk", "spec"],
            ["builder-agent-desk", "qa-agent-desk", "build"],
            ["qa-agent-desk", "security-gates", "review"],
            ["security-gates", "operator-command-ring", "approval"],
            ["operator-command-ring", "memory-browser", "notes"]
          ];
          plan.forEach(([from, to, label], index) => {
            this.time.delayedCall(index * 1500, () => this.dispatchAssistant(from, to, label));
          });

          demoMissionVisualSteps.forEach((step) => {
            this.time.delayedCall(step.delayMs, () => {
              this.setAgentMode(step.agentId, step.mode, step.statusText);
              const stationId = demoStationByAgent[step.agentId] ?? stationByAgent.get(step.agentId)?.id;
              if (stationId) this.selectStation(stationId);
            });
          });
        }

        private onPanelOpened = (event: CustomEvent<{ targetId?: string }>) => {
          const station = event.detail.targetId ? stationByTarget.get(event.detail.targetId) : undefined;
          if (station) this.selectStation(station.id);
        };

        private onDemoMissionRun = () => {
          this.runDemoMissionSequence();
        };

        private markRect(x: number, y: number, width: number, height: number) {
          for (let row = y; row < y + height; row += 1) {
            for (let col = x; col < x + width; col += 1) {
              this.blocked.add(tileKey({ x: col, y: row }));
            }
          }
        }

        private unblockTile(tile: TilePoint) {
          this.blocked.delete(tileKey(tile));
        }

        private drawWallRect(x: number, y: number, width: number, height: number) {
          for (let row = y; row < y + height; row += 1) {
            for (let col = x; col < x + width; col += 1) {
              const world = tileToWorld({ x: col, y: row });
              this.add.rectangle(world.x + 2, world.y + 5, TILE, TILE, 0x020509, 0.34).setDepth(world.y + 17);
              this.add.rectangle(world.x, world.y, TILE, TILE, 0x172234, 1).setDepth(world.y + 20);
              this.add.rectangle(world.x, world.y - 9, TILE, 12, 0x33415e, 1).setDepth(world.y + 21);
              this.add.rectangle(world.x, world.y - 15, TILE - 4, 3, 0x6d7fa8, 0.28).setDepth(world.y + 22);
            }
          }
        }

        private drawDividerWithDoors(x: number, y: number, width: number, height: number, doors: TilePoint[]) {
          const doorKeys = new Set(doors.map((door) => tileKey(door)));
          for (let row = y; row < y + height; row += 1) {
            for (let col = x; col < x + width; col += 1) {
              const tile = { x: col, y: row };
              if (doorKeys.has(tileKey(tile))) {
                const world = tileToWorld(tile);
                this.add.rectangle(world.x, world.y, TILE - 2, TILE - 2, 0x2f4354, 0.52).setDepth(7);
                this.add.rectangle(world.x, world.y + 12, TILE - 8, 3, 0x35d7ff, 0.16).setDepth(8);
                continue;
              }
              this.blocked.add(tileKey(tile));
              const world = tileToWorld(tile);
              this.add.rectangle(world.x + 2, world.y + 5, TILE, TILE, 0x020509, 0.28).setDepth(world.y + 17);
              this.add.rectangle(world.x, world.y, TILE, TILE, 0x172234, 1).setDepth(world.y + 20);
              this.add.rectangle(world.x, world.y - 9, TILE, 12, 0x33415e, 1).setDepth(world.y + 21);
              this.add.rectangle(world.x, world.y - 15, TILE - 4, 3, 0x6d7fa8, 0.24).setDepth(world.y + 22);
            }
          }
        }

        private drawDebugTiles() {
          for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
              const blocked = this.blocked.has(tileKey({ x, y }));
              const debug = this.add
                .rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 4, TILE - 4, blocked ? 0xff4a4a : 0x43ffc1, blocked ? 0.18 : 0.06)
                .setStrokeStyle(1, blocked ? 0xff7777 : 0x43ffc1, blocked ? 0.36 : 0.16)
                .setDepth(3900)
                .setVisible(false);
              this.debugTiles.push(debug);
            }
          }
        }

        private isWalkable(tile: TilePoint) {
          if (tile.x < 1 || tile.y < 1 || tile.x >= COLS - 1 || tile.y >= ROWS - 1) return false;
          return !this.blocked.has(tileKey(tile));
        }

        private findPath(start: TilePoint, goal: TilePoint) {
          if (sameTile(start, goal)) return [start];
          const queue: TilePoint[][] = [[start]];
          const visited = new Set<string>([tileKey(start)]);
          const neighbors = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
          ];

          while (queue.length) {
            const path = queue.shift() ?? [];
            const current = path[path.length - 1];
            if (sameTile(current, goal)) return path;
            const ranked = neighbors
              .map((delta) => ({ x: current.x + delta.x, y: current.y + delta.y }))
              .sort((a, b) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y) - (Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y)));
            for (const next of ranked) {
              const key = tileKey(next);
              if (visited.has(key) || !this.isWalkable(next)) continue;
              visited.add(key);
              queue.push([...path, next]);
            }
          }

          return [start];
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: OFFICE_W,
        height: OFFICE_H,
        transparent: false,
        scene: [OfficeScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      });
    };

    void boot();

    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

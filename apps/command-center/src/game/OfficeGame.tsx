"use client";

import { useEffect, useRef } from "react";
import { officeInteractables } from "@agentos/game-schema";
import { emitOfficeInteraction } from "./eventBus";

export function OfficeGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let destroyed = false;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;

    const boot = async () => {
      const Phaser = await import("phaser");
      if (destroyed || !containerRef.current) return;

      class OfficeScene extends Phaser.Scene {
        private highlightMap = new Map<string, { rect: any; label: any; status?: any }>();

        private selectedId?: string;

        constructor() {
          super("OfficeScene");
        }

        preload() {
          this.load.image("office", "/assets/office-master.png");
          this.load.image("mission-board-prop", "/assets/executive/props/prop_mission_board.png");
          this.load.image("approval-console-prop", "/assets/executive/props/prop_approval_console.png");
          this.load.image("server-pedestal-prop", "/assets/executive/props/prop_small_server_pedestal.png");
          this.load.image("status-display-prop", "/assets/executive/props/prop_holographic_status_display.png");
          this.load.image("standing-podium-prop", "/assets/executive/props/prop_standing_podium.png");
          this.load.image("desk-prop", "/assets/executive/props/prop_executive_desk_front.png");
          this.load.image("rug-prop", "/assets/executive/props/prop_executive_rug.png");
          this.load.image("status-online", "/assets/executive/vfx/status_dot_online.png");
          this.load.image("status-busy", "/assets/executive/vfx/status_dot_busy.png");
          this.load.image("status-offline", "/assets/executive/vfx/status_dot_offline.png");
          this.load.image("typing-bubble", "/assets/executive/vfx/vfx_typing_bubble.png");
          this.load.image("warning-triangle", "/assets/executive/vfx/vfx_warning_triangle.png");
          this.load.image("selected-ring", "/assets/executive/vfx/vfx_selected_glow_ring.png");
          this.load.image("hover-outline", "/assets/executive/vfx/vfx_hover_outline_frame.png");

          for (let index = 1; index <= 4; index += 1) {
            this.load.image(`executive-idle-${index}`, `/assets/executive/movement/executive_idle_front_0${index}.png`);
            this.load.image(`executive-walk-${index}`, `/assets/executive/movement/executive_walk_down_0${index}.png`);
          }
        }

        create() {
          const bg = this.add.image(640, 360, "office");
          const scale = Math.max(1280 / bg.width, 720 / bg.height);
          bg.setScale(scale);

          this.add.image(640, 610, "rug-prop").setScale(0.7).setAlpha(0.48);
          this.placeProp(625, 625, "standing-podium-prop", 0.74);
          this.placeProp(640, 120, "mission-board-prop", 0.65);
          this.placeProp(1045, 152, "approval-console-prop", 0.64);
          this.placeProp(1122, 320, "server-pedestal-prop", 0.78);
          this.placeProp(864, 144, "status-display-prop", 0.64);
          this.placeProp(250, 345, "desk-prop", 0.44);
          this.placeProp(395, 465, "desk-prop", 0.36);
          this.placeProp(820, 470, "desk-prop", 0.36);

          this.createAgentSprite("agentos-operator", 650, 365, "thinking");
          this.createAgentSprite("product-agent", 235, 355, "idle");
          this.createAgentSprite("builder-agent", 398, 498, "working");
          this.createAgentSprite("qa-agent", 825, 500, "blocked");
          this.createAgentSprite("security-agent", 1012, 355, "idle");

          officeInteractables.forEach((target) => {
            const zone = this.add
              .zone(target.x + target.width / 2, target.y + target.height / 2, target.width, target.height)
              .setInteractive({ useHandCursor: true });

            const strokeColor = target.kind === "agent" ? 0x50e3a4 : 0x38d5ff;
            const rect = this.add
              .rectangle(target.x, target.y, target.width, target.height)
              .setOrigin(0)
              .setStrokeStyle(2, strokeColor, 0.44)
              .setFillStyle(0x08101a, 0.02)
              .setDepth(6);

            const label = this.add
              .text(target.x + 8, target.y + 8, target.label, {
                color: "#f5f8ff",
                fontFamily: "Georgia",
                fontSize: "13px",
                backgroundColor: "rgba(4, 8, 12, 0.74)",
                padding: { x: 6, y: 4 }
              })
              .setDepth(7);

            const status = target.kind === "agent"
              ? this.add.image(target.x + target.width - 18, target.y + 22, "status-online").setScale(0.35).setDepth(8)
              : undefined;

            this.highlightMap.set(target.id, { rect, label, status });

            zone.on("pointerover", () => {
              if (this.selectedId !== target.id) {
                rect.setFillStyle(0x38d5ff, 0.14);
                rect.setStrokeStyle(2, 0x38d5ff, 0.85);
              }
              label.setColor("#ffffff");
              this.input.setDefaultCursor("pointer");
            });
            zone.on("pointerout", () => {
              if (this.selectedId !== target.id) {
                rect.setFillStyle(0x08101a, 0.02);
                rect.setStrokeStyle(2, strokeColor, 0.44);
              }
              label.setColor("#f5f8ff");
              this.input.setDefaultCursor("default");
            });
            zone.on("pointerdown", () => {
              this.setSelectedTarget(target.id);
              emitOfficeInteraction(target);
            });
          });

          this.add
            .text(20, 20, "AgentOS Command Center", {
              color: "#ffffff",
              fontFamily: "Georgia",
              fontSize: "24px",
              backgroundColor: "rgba(4, 8, 12, 0.68)",
              padding: { x: 10, y: 8 }
            })
            .setDepth(5);

          this.add
            .text(20, 62, "Click a station, agent, or board to open the command surface.", {
              color: "#d0deee",
              fontFamily: "Verdana",
              fontSize: "14px",
              backgroundColor: "rgba(4, 8, 12, 0.6)",
              padding: { x: 8, y: 4 }
            })
            .setDepth(5);

          window.addEventListener("agentos:panel-opened", this.onPanelOpened as EventListener);
        }

        private onPanelOpened = (event: CustomEvent<{ targetId?: string }>) => {
          if (event.detail.targetId) {
            this.setSelectedTarget(event.detail.targetId);
          }
        };

        private setSelectedTarget(targetId: string) {
          this.selectedId = targetId;
          this.highlightMap.forEach((entry, id) => {
            if (id === targetId) {
              entry.rect.setFillStyle(0x50e3a4, 0.18);
              entry.rect.setStrokeStyle(3, 0x50e3a4, 1);
              entry.label.setColor("#ffffff");
              entry.status?.setTexture("status-busy");
            } else {
              entry.rect.setFillStyle(0x08101a, 0.02);
              entry.rect.setStrokeStyle(2, 0x38d5ff, 0.44);
              entry.label.setColor("#f5f8ff");
              entry.status?.setTexture("status-online");
            }
          });
        }

        private createAgentSprite(id: string, x: number, y: number, mood: "idle" | "thinking" | "working" | "blocked") {
          const sprite = this.add.image(x, y, "executive-idle-1").setScale(0.34).setDepth(5);
          this.tweens.add({
            targets: sprite,
            y: y - 6,
            duration: 1300,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });

          const bubbleKey =
            mood === "working" ? "typing-bubble" : mood === "blocked" ? "warning-triangle" : mood === "thinking" ? "typing-bubble" : undefined;

          if (bubbleKey) {
            this.add.image(x + 22, y - 78, bubbleKey).setScale(mood === "blocked" ? 0.24 : 0.3).setDepth(6);
          }

          const statusTexture = mood === "blocked" ? "status-offline" : mood === "working" ? "status-busy" : "status-online";
          this.add.image(x + 24, y - 38, statusTexture).setScale(0.34).setDepth(7);
          this.add.text(x - 34, y + 42, id.replaceAll("-", " "), {
            color: "#d0deee",
            fontFamily: "Verdana",
            fontSize: "11px",
            backgroundColor: "rgba(4, 8, 12, 0.58)",
            padding: { x: 4, y: 2 }
          }).setDepth(7);
        }

        private placeProp(x: number, y: number, texture: string, scale: number) {
          this.add.image(x, y, texture).setScale(scale).setDepth(4);
        }

        shutdown() {
          window.removeEventListener("agentos:panel-opened", this.onPanelOpened as EventListener);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 1280,
        height: 720,
        backgroundColor: "#090d13",
        scene: [OfficeScene],
        scale: {
          mode: Phaser.Scale.FIT,
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

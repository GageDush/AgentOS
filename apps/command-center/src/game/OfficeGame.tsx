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
        constructor() {
          super("OfficeScene");
        }

        preload() {
          this.load.image("office", "/assets/office-master.png");
        }

        create() {
          const bg = this.add.image(640, 360, "office");
          const scale = Math.max(1280 / bg.width, 720 / bg.height);
          bg.setScale(scale);

          officeInteractables.forEach((target) => {
            const zone = this.add
              .zone(target.x + target.width / 2, target.y + target.height / 2, target.width, target.height)
              .setInteractive({ useHandCursor: true });

            const strokeColor = target.kind === "agent" ? 0x50e3a4 : 0x38d5ff;
            const rect = this.add
              .rectangle(target.x, target.y, target.width, target.height)
              .setOrigin(0)
              .setStrokeStyle(2, strokeColor, 0.64)
              .setFillStyle(0x08101a, 0.08);

            const label = this.add
              .text(target.x + 8, target.y + 8, target.label, {
                color: "#f5f8ff",
                fontFamily: "Arial",
                fontSize: "13px",
                backgroundColor: "rgba(4, 8, 12, 0.62)",
                padding: { x: 6, y: 4 }
              })
              .setDepth(3);

            zone.on("pointerover", () => {
              rect.setFillStyle(0x38d5ff, 0.16);
              label.setColor("#ffffff");
            });
            zone.on("pointerout", () => {
              rect.setFillStyle(0x08101a, 0.08);
              label.setColor("#f5f8ff");
            });
            zone.on("pointerdown", () => emitOfficeInteraction(target));

            if (target.kind === "agent") {
              this.add.circle(target.x + target.width - 18, target.y + 22, 8, strokeColor, 0.95).setDepth(4);
            }
          });

          this.add
            .text(20, 20, "AgentOS Command Center", {
              color: "#ffffff",
              fontFamily: "Arial",
              fontSize: "22px",
              backgroundColor: "rgba(4, 8, 12, 0.68)",
              padding: { x: 10, y: 8 }
            })
            .setDepth(5);
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

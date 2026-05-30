"use client";

import { create } from "zustand";
import type { OfficeInteractable } from "@agentos/game-schema";

export type PanelState = {
  activePanel: string;
  activeTarget?: OfficeInteractable;
  openPanel: (panel: string, target?: OfficeInteractable) => void;
};

export const useCommandCenterStore = create<PanelState>((set) => ({
  activePanel: "MissionBoardPanel",
  activeTarget: undefined,
  openPanel: (panel, target) => set({ activePanel: panel, activeTarget: target })
}));

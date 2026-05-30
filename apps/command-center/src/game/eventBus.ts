import type { OfficeInteractable } from "@agentos/game-schema";

export const emitOfficeInteraction = (target: OfficeInteractable) => {
  window.dispatchEvent(new CustomEvent("agentos:interaction", { detail: target }));
};

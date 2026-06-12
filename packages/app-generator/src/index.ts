import type { UiGenerationSpec, UiPreset } from "@agentos/shared";
import { DEFAULT_UI_PRESET, DEFAULT_UI_SURFACES } from "@agentos/shared";

export function resolveUiPreset(spec?: UiGenerationSpec): UiPreset {
  return spec?.uiPreset ?? DEFAULT_UI_PRESET;
}

export function resolveUiSurfaces(spec?: UiGenerationSpec): UiGenerationSpec["surfaces"] {
  return spec?.surfaces ?? DEFAULT_UI_SURFACES;
}

export function buildUiGenerationSpec(overrides?: Partial<UiGenerationSpec>): UiGenerationSpec {
  return {
    uiPreset: overrides?.uiPreset ?? DEFAULT_UI_PRESET,
    surfaces: overrides?.surfaces ?? DEFAULT_UI_SURFACES
  };
}

export function getForgeTemplatePaths() {
  return {
    page: "packages/app-generator/templates/agentos-forge/page.tsx",
    components: "packages/app-generator/templates/agentos-forge/components.tsx",
    sampleData: "packages/app-generator/templates/agentos-forge/sample-data.ts",
    styleContract: "packages/app-generator/templates/agentos-forge/style-contract.md"
  };
}

export { resolveOutputDir, scaffoldApp, type ScaffoldResult } from "./scaffold";

export const FORGE_UI_SPEC: UiGenerationSpec = {
  uiPreset: "agentos-forge",
  surfaces: [
    "dashboard",
    "mission-control",
    "approval-center",
    "integration-settings",
    "generated-app-preview"
  ]
};

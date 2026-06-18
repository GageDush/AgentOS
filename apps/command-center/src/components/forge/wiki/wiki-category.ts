/* ────────────────────────────────────────────────────────────────────────
   Shared wiki category helper — maps a wiki slug prefix to a human label and
   a Forge-palette colour. Used by both the Browse sidebar (ForgeWikiView) and
   the Map view (graph nodes / category filter / legend).

   Colours are warm / orange-adjacent / neutral only — no blue or violet
   primaries (Forge canon).
   ──────────────────────────────────────────────────────────────────────── */

export function wikiCategory(slug: string): string {
  if (slug === "index") return "Home";
  if (slug.startsWith("sessions/cursor")) return "Cursor sessions";
  if (slug.startsWith("learning")) return "Learning";
  if (slug.startsWith("product")) return "Product";
  if (slug.startsWith("flows")) return "Flows";
  if (slug.startsWith("agents")) return "Agents";
  if (slug.startsWith("packages")) return "Packages";
  if (slug.startsWith("apps")) return "Apps";
  if (slug.startsWith("docs")) return "Documentation";
  if (slug.startsWith("planning")) return "Planning";
  if (slug.startsWith("areas")) return "Areas";
  return "Other";
}

/** Stable display order for category chips / legend. */
export const WIKI_CATEGORY_ORDER = [
  "Home",
  "Agents",
  "Flows",
  "Packages",
  "Apps",
  "Product",
  "Documentation",
  "Learning",
  "Planning",
  "Areas",
  "Cursor sessions",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Home: "#FF6A35",
  Agents: "#FF8A4C",
  Flows: "#F5A623",
  Packages: "#E0894C",
  Apps: "#D8A24C",
  Product: "#F04E1A",
  Documentation: "#C99A6A",
  Learning: "#E0A36A",
  Planning: "#D85A30",
  Areas: "#A89D92",
  "Cursor sessions": "#8A7E72",
  Other: "#6F665E",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
}

export function categoryColorForSlug(slug: string): string {
  return categoryColor(wikiCategory(slug));
}

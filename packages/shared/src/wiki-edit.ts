export type WikiEditAction = "create" | "merge";

export type WikiEditProposal = {
  targetSlug: string;
  action: WikiEditAction;
  section?: string;
  markdownPatch: string;
  newLinks: string[];
  dedupeKey?: string;
};

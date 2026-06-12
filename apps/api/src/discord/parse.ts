type InteractionOption = { name: string; value?: string; type?: number; options?: InteractionOption[] };

export type ParsedAgentOsCommand = {
  subcommand: string;
  options: InteractionOption[];
};

export function parseAgentOsCommand(data: { name: string; options?: InteractionOption[] }): ParsedAgentOsCommand | null {
  if (data.name === "agentos") {
    const sub = data.options?.[0];
    if (!sub?.name) return null;
    return { subcommand: sub.name, options: sub.options ?? [] };
  }

  // Legacy top-level commands still accepted during migration.
  if (data.name) {
    return { subcommand: data.name, options: data.options ?? [] };
  }

  return null;
}

export function optionValue(options: InteractionOption[] | undefined, name: string) {
  return options?.find((option) => option.name === name)?.value?.trim();
}

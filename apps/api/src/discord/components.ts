export type ActionButtonStyle = "primary" | "secondary" | "success" | "danger" | "link";

export type ActionButtonSpec = {
  action: string;
  targetId?: string;
  label: string;
  style?: ActionButtonStyle;
  emoji?: string;
  disabled?: boolean;
  url?: string;
};

const STYLE_MAP: Record<ActionButtonStyle, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5
};

const MAX_BUTTONS_PER_ROW = 5;
const MAX_ROWS = 5;

export function encodeCustomId(action: string, targetId?: string) {
  const id = targetId ? `${action}:${targetId}` : action;
  return `aos:${id}`.slice(0, 100);
}

export function parseCustomId(customId: string) {
  if (!customId.startsWith("aos:")) return null;
  const payload = customId.slice(4);
  const separator = payload.indexOf(":");
  if (separator === -1) {
    return { action: payload, targetId: undefined };
  }
  return {
    action: payload.slice(0, separator),
    targetId: payload.slice(separator + 1) || undefined
  };
}

export function buildActionRows(buttons: ActionButtonSpec[]) {
  const rows: Array<{ type: 1; components: Record<string, unknown>[] }> = [];
  const chunks: ActionButtonSpec[][] = [];
  for (let index = 0; index < buttons.length; index += MAX_BUTTONS_PER_ROW) {
    chunks.push(buttons.slice(index, index + MAX_BUTTONS_PER_ROW));
  }

  for (const chunk of chunks.slice(0, MAX_ROWS)) {
    rows.push({
      type: 1,
      components: chunk.map((button) => {
        const style = button.style ?? "secondary";
        const component: Record<string, unknown> = {
          type: style === "link" ? 2 : 2,
          style: STYLE_MAP[style],
          label: button.label.slice(0, 80),
          disabled: button.disabled ?? false
        };
        if (style === "link" && button.url) {
          component.url = button.url;
        } else {
          component.custom_id = encodeCustomId(button.action, button.targetId);
        }
        if (button.emoji) {
          component.emoji = { name: button.emoji };
        }
        return component;
      })
    });
  }

  return rows;
}

export function disableAllComponents(
  rows: Array<{ type: 1; components: Array<Record<string, unknown>> }> | undefined
) {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    ...row,
    components: row.components.map((component) => ({
      ...component,
      disabled: true
    }))
  }));
}

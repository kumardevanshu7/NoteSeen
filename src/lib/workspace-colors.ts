import type { WorkspaceColor } from "@/lib/types";

export const WORKSPACE_COLOR_OPTIONS: {
  id: WorkspaceColor;
  label: string;
  swatch: string;
  wash: string;
  line: string;
}[] = [
  {
    id: "azure",
    label: "Azure",
    swatch: "var(--theme-azure-ink)",
    wash: "var(--theme-azure-wash)",
    line: "var(--theme-azure-line)",
  },
  {
    id: "sage",
    label: "Sage",
    swatch: "var(--theme-sage-ink)",
    wash: "var(--theme-sage-wash)",
    line: "var(--theme-sage-line)",
  },
  {
    id: "sand",
    label: "Sand",
    swatch: "var(--theme-sand-ink)",
    wash: "var(--theme-sand-wash)",
    line: "var(--theme-sand-line)",
  },
  {
    id: "aurora",
    label: "Aurora",
    swatch: "var(--theme-aurora-ink)",
    wash: "var(--theme-aurora-wash)",
    line: "var(--theme-aurora-line)",
  },
  {
    id: "coral",
    label: "Coral",
    swatch: "var(--workspace-coral-ink)",
    wash: "var(--workspace-coral-wash)",
    line: "var(--workspace-coral-line)",
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "var(--workspace-violet-ink)",
    wash: "var(--workspace-violet-wash)",
    line: "var(--workspace-violet-line)",
  },
];

const byId = new Map(WORKSPACE_COLOR_OPTIONS.map((option) => [option.id, option]));

export function workspaceColorTheme(color: WorkspaceColor) {
  return byId.get(color) ?? WORKSPACE_COLOR_OPTIONS[0];
}

export function isWorkspaceColor(value: string): value is WorkspaceColor {
  return byId.has(value as WorkspaceColor);
}

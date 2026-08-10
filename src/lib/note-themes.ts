import type { LineSpacing, NoteTheme, TextSize, Typeface } from "./types";

export interface ThemeOption {
  id: NoteTheme;
  label: string;
  /** Values resolve to CSS variables so light and dark stay in one place. */
  wash: string;
  line: string;
  ink: string;
}

export const NOTE_THEMES: ThemeOption[] = [
  {
    id: "plain",
    label: "Paper",
    wash: "var(--theme-plain-wash)",
    line: "var(--theme-plain-line)",
    ink: "var(--theme-plain-ink)",
  },
  {
    id: "azure",
    label: "Azure",
    wash: "var(--theme-azure-wash)",
    line: "var(--theme-azure-line)",
    ink: "var(--theme-azure-ink)",
  },
  {
    id: "sage",
    label: "Sage",
    wash: "var(--theme-sage-wash)",
    line: "var(--theme-sage-line)",
    ink: "var(--theme-sage-ink)",
  },
  {
    id: "sand",
    label: "Sand",
    wash: "var(--theme-sand-wash)",
    line: "var(--theme-sand-line)",
    ink: "var(--theme-sand-ink)",
  },
  {
    id: "aurora",
    label: "Aurora",
    wash: "var(--theme-aurora-wash)",
    line: "var(--theme-aurora-line)",
    ink: "var(--theme-aurora-ink)",
  },
];

export const TYPEFACES: { id: Typeface; label: string; hint: string }[] = [
  { id: "sans", label: "Unica-style sans", hint: "Inter" },
  { id: "display", label: "Display grotesk", hint: "Space Grotesk" },
  { id: "serif", label: "Editorial serif", hint: "Georgia" },
  { id: "mono", label: "Technical mono", hint: "JetBrains Mono" },
];

export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: "s", label: "Compact" },
  { id: "m", label: "Regular" },
  { id: "l", label: "Large" },
];

export const LINE_SPACINGS: { id: LineSpacing; label: string }[] = [
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

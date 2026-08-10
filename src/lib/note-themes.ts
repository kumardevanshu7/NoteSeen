import type { LineSpacing, NoteTheme, TextSize, Typeface } from "./types";

export interface ThemeOption {
  id: NoteTheme;
  label: string;
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

/** Four design fonts — self-hosted / system, no Google Fonts megapack. */
export const TYPEFACES: { id: Typeface; label: string; hint: string }[] = [
  { id: "inter", label: "Inter", hint: "Sans" },
  { id: "spacegrotesk", label: "Space Grotesk", hint: "Display" },
  { id: "georgia", label: "Georgia", hint: "Serif" },
  { id: "jetbrains", label: "JetBrains Mono", hint: "Mono" },
];

/** Map older typeface ids onto the four design fonts. */
export const TYPEFACE_ALIASES: Record<string, Typeface> = {
  sans: "inter",
  roboto: "inter",
  opensans: "inter",
  lato: "inter",
  montserrat: "inter",
  poppins: "inter",
  nunito: "inter",
  display: "spacegrotesk",
  serif: "georgia",
  playfair: "georgia",
  merriweather: "georgia",
  times: "georgia",
  mono: "jetbrains",
  firacode: "jetbrains",
  sourcecode: "jetbrains",
  courier: "jetbrains",
};

export function resolveTypeface(raw: string | undefined | null): Typeface {
  if (!raw) return "inter";
  if (TYPEFACES.some((t) => t.id === raw)) return raw as Typeface;
  return TYPEFACE_ALIASES[raw] ?? "inter";
}

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

/** Code block languages — prompts use plain txt. */
export const CODE_LANGUAGES = [
  { id: "txt", label: "Plain text (.txt)", forPrompt: true },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "sql", label: "SQL" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash / Shell" },
  { id: "markdown", label: "Markdown" },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGES)[number]["id"];

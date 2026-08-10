export type NoteTheme = "plain" | "azure" | "sage" | "sand" | "aurora";
export type Typeface =
  | "inter"
  | "roboto"
  | "opensans"
  | "lato"
  | "montserrat"
  | "poppins"
  | "nunito"
  | "spacegrotesk"
  | "playfair"
  | "merriweather"
  | "georgia"
  | "times"
  | "jetbrains"
  | "firacode"
  | "sourcecode"
  | "courier"
  // legacy ids from early builds
  | "sans"
  | "display"
  | "serif"
  | "mono";
export type TextSize = "s" | "m" | "l";
export type LineSpacing = "tight" | "normal" | "relaxed";
export type View = "editor" | "all" | "shared" | "trash";
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type NoteKind = "note" | "prompt";

export interface Note {
  id: string;
  /** Regular notepad entry or a reusable prompt. */
  kind: NoteKind;
  title: string;
  /** Tags — especially useful for prompts. */
  tags: string[];
  /** Rich text, the source of truth for rendering. */
  html: string;
  /** Flattened text kept alongside html for search and previews. */
  text: string;
  theme: NoteTheme;
  typeface: Typeface;
  size: TextSize;
  spacing: LineSpacing;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** Set when the note is in the trash; null while it is live. */
  deletedAt: number | null;
  /** Name of the .noteseen file this note is linked to, when opened from disk. */
  fileName: string | null;
}

export interface NoteFilePayload {
  format: "noteseen";
  version: 1;
  note: Pick<
    Note,
    | "id"
    | "kind"
    | "title"
    | "tags"
    | "html"
    | "text"
    | "theme"
    | "typeface"
    | "size"
    | "spacing"
    | "createdAt"
    | "updatedAt"
  >;
  app: { name: "NoteSeen"; url?: string };
}

/** Site-wide vault: one security question + answer for edit/delete. */
export interface VaultConfig {
  question: string;
  /** SHA-256 hex of the normalized answer. */
  answerHash: string;
  createdAt: number;
}

export function normalizeNote(raw: Partial<Note> & { id: string }): Note {
  const legacyTypeface = raw.typeface as string | undefined;
  const typefaceMap: Record<string, Note["typeface"]> = {
    sans: "inter",
    display: "spacegrotesk",
    serif: "georgia",
    mono: "jetbrains",
  };
  const typeface =
    (legacyTypeface && typefaceMap[legacyTypeface]) ||
    (legacyTypeface as Note["typeface"] | undefined) ||
    "inter";

  return {
    id: raw.id,
    kind: raw.kind === "prompt" ? "prompt" : "note",
    title: raw.title ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    html: raw.html ?? "<p></p>",
    text: raw.text ?? "",
    theme: raw.theme ?? "plain",
    typeface,
    size: raw.size ?? "m",
    spacing: raw.spacing ?? "normal",
    pinned: Boolean(raw.pinned),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    deletedAt: raw.deletedAt ?? null,
    fileName: raw.fileName ?? null,
  };
}

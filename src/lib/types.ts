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
export type View = "editor" | "all" | "cards" | "suggestions" | "shared" | "trash" | "labels" | "secrets";
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type NoteKind = "note" | "prompt" | "promptCard";
export type SecretCategory = "api" | "password" | "other";

export interface Note {
  id: string;
  /** Regular notepad entry or a reusable prompt. */
  kind: NoteKind;
  title: string;
  /** Short caption under a prompt-card title. Empty on notes/prompts. */
  subtitle: string;
  /** Tags — especially useful for prompts. */
  tags: string[];
  /** Rich text, the source of truth for rendering. */
  html: string;
  /** Flattened text kept alongside html for search and previews. */
  text: string;
  /** Cover image for prompt cards (public URL). Notes/prompts leave this null. */
  coverUrl: string | null;
  theme: NoteTheme;
  typeface: Typeface;
  size: TextSize;
  spacing: LineSpacing;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** Last time the note was opened in the editor. Falls back to updatedAt. */
  openedAt: number;
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

/** Separate 4-digit PIN vault for API keys and passwords. */
export interface SecretPinConfig {
  /** SHA-256 hex of the PIN (with salt). */
  pinHash: string;
  /** Hex salt used for both hash verify and AES key derivation. */
  salt: string;
  createdAt: number;
}

export interface SecretEntry {
  id: string;
  title: string;
  category: SecretCategory;
  /** Optional username / account label (plain). */
  username: string;
  /** AES-GCM ciphertext of the secret value (hex). */
  valueCipher: string;
  /** AES-GCM IV (hex). */
  valueIv: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export function normalizeNote(raw: Partial<Note> & { id: string }): Note {
  const legacy = raw.typeface as string | undefined;
  const aliases: Record<string, Typeface> = {
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
  const allowed = new Set(["inter", "spacegrotesk", "georgia", "jetbrains"]);
  const typeface =
    (legacy && allowed.has(legacy) ? (legacy as Typeface) : undefined) ||
    (legacy ? aliases[legacy] : undefined) ||
    "inter";

  const kind: NoteKind =
    raw.kind === "promptCard" ? "promptCard" : raw.kind === "prompt" ? "prompt" : "note";
  const cover =
    typeof raw.coverUrl === "string" && raw.coverUrl.trim() ? raw.coverUrl.trim() : null;

  return {
    id: raw.id,
    kind,
    title: raw.title ?? "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    html: raw.html ?? "<p></p>",
    text: raw.text ?? "",
    coverUrl: kind === "promptCard" ? cover : null,
    theme: raw.theme ?? "plain",
    typeface,
    size: raw.size ?? "m",
    spacing: raw.spacing ?? "normal",
    pinned: Boolean(raw.pinned),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    openedAt:
      typeof raw.openedAt === "number"
        ? raw.openedAt
        : typeof raw.updatedAt === "number"
          ? raw.updatedAt
          : Date.now(),
    deletedAt: raw.deletedAt ?? null,
    fileName: raw.fileName ?? null,
  };
}

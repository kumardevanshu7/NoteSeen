import {
  downloadFile,
  ensurePermission,
  openFilePicker,
  saveFilePicker,
  writeHandle,
  type FilePickerAccept,
  type NsFileHandle,
} from "./fs";
import { htmlToMarkdown, markdownToHtml, plainTextToHtml } from "./markdown";
import type { Note, NoteFilePayload } from "./types";
import { firstLine, htmlToPlainText, toFileStem } from "./utils";

export const NOTE_EXT = ".noteseen";
export const NOTE_MIME = "application/x-noteseen";

const ACCEPT_TYPES: FilePickerAccept[] = [
  { description: "NoteSeen note", accept: { [NOTE_MIME]: [NOTE_EXT] } },
  { description: "Markdown", accept: { "text/markdown": [".md", ".markdown"] } },
  { description: "Plain text", accept: { "text/plain": [".txt"] } },
];

export function noteFileName(note: Note): string {
  return `${toFileStem(note.title)}${NOTE_EXT}`;
}

export function serializeNote(note: Note): string {
  const payload: NoteFilePayload = {
    format: "noteseen",
    version: 1,
    app: { name: "NoteSeen" },
    note: {
      id: note.id,
      kind: note.kind,
      title: note.title,
      tags: note.tags,
      html: note.html,
      text: note.text,
      theme: note.theme,
      typeface: note.typeface,
      size: note.size,
      spacing: note.spacing,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export interface ImportedNote {
  title: string;
  html: string;
  text: string;
  kind?: Note["kind"];
  tags?: string[];
  theme?: Note["theme"];
  typeface?: Note["typeface"];
  size?: Note["size"];
  spacing?: Note["spacing"];
  createdAt?: number;
  updatedAt?: number;
  sourceId?: string;
  fileName: string;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(noteseen|md|markdown|txt|html?)$/i, "").trim();
}

export async function readNoteFile(file: File): Promise<ImportedNote> {
  const raw = await file.text();
  const name = file.name || `Untitled${NOTE_EXT}`;
  const lower = name.toLowerCase();

  if (lower.endsWith(NOTE_EXT) || raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Partial<NoteFilePayload>;
      const note = parsed.note;
      if (parsed.format === "noteseen" && note) {
        const html = note.html ?? "<p></p>";
        return {
          title: note.title || titleFromFileName(name) || "Untitled note",
          html,
          text: note.text ?? htmlToPlainText(html),
          kind: note.kind,
          tags: note.tags,
          theme: note.theme,
          typeface: note.typeface,
          size: note.size,
          spacing: note.spacing,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          sourceId: note.id,
          fileName: name,
        };
      }
    } catch {
      // Fall through and treat the file as plain text rather than failing.
    }
  }

  if (/\.html?$/i.test(lower)) {
    const text = htmlToPlainText(raw);
    return { title: titleFromFileName(name) || firstLine(text) || "Untitled note", html: raw, text, fileName: name };
  }

  const html = /\.(md|markdown)$/i.test(lower) ? markdownToHtml(raw) : plainTextToHtml(raw);
  const text = htmlToPlainText(html);
  return {
    title: titleFromFileName(name) || firstLine(text) || "Untitled note",
    html,
    text,
    fileName: name,
  };
}

export async function pickNoteFiles(): Promise<NsFileHandle[]> {
  return openFilePicker({ multiple: true, types: ACCEPT_TYPES, id: "noteseen-notes" });
}

export async function pickSaveTarget(note: Note): Promise<NsFileHandle | null> {
  return saveFilePicker({
    suggestedName: noteFileName(note),
    types: [ACCEPT_TYPES[0]],
    id: "noteseen-notes",
    excludeAcceptAllOption: false,
  });
}

export async function writeNoteToHandle(handle: NsFileHandle, note: Note): Promise<boolean> {
  if (!(await ensurePermission(handle, "readwrite"))) return false;
  await writeHandle(handle, serializeNote(note));
  return true;
}

export function downloadNote(note: Note): void {
  downloadFile(noteFileName(note), serializeNote(note), NOTE_MIME);
}

export function downloadMarkdown(note: Note): void {
  const body = htmlToMarkdown(note.html);
  const contents = `# ${note.title || "Untitled note"}\n\n${body}\n`;
  downloadFile(`${toFileStem(note.title)}.md`, contents, "text/markdown");
}

export async function copyMarkdown(note: Note): Promise<void> {
  const body = htmlToMarkdown(note.html);
  await navigator.clipboard.writeText(`# ${note.title || "Untitled note"}\n\n${body}\n`);
}

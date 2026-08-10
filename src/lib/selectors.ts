import type { Note } from "./types";

function byRecency(a: Note, b: Note): number {
  return b.updatedAt - a.updatedAt;
}

function pinnedFirst(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return byRecency(a, b);
}

export function liveNotes(notes: Record<string, Note>): Note[] {
  return Object.values(notes)
    .filter((note) => !note.deletedAt)
    .sort(pinnedFirst);
}

export function trashedNotes(notes: Record<string, Note>): Note[] {
  return Object.values(notes)
    .filter((note) => note.deletedAt)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return notes;
  const terms = needle.split(/\s+/);
  return notes.filter((note) => {
    const haystack = `${note.title}\n${note.text}\n${note.tags.join(" ")}\n${note.kind}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function noteLabel(note: Note): string {
  if (note.title.trim()) return note.title.trim();
  const line = note.text.split("\n").find((value) => value.trim().length > 0);
  if (line?.trim()) return line.trim();
  return note.kind === "prompt" ? "Untitled prompt" : "Untitled note";
}

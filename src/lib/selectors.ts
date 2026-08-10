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

/** Unique labels across live notes, sorted A→Z with usage counts. */
export function collectLabels(
  notes: Record<string, Note>,
): { label: string; count: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const note of liveNotes(notes)) {
    for (const tag of note.tags) {
      const key = tag.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { label: tag, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function normalizeLabelName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

import type { Note, NoteTheme, Workspace } from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";

function byRecency(a: Note, b: Note): number {
  return b.updatedAt - a.updatedAt;
}

function pinnedFirst(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return byRecency(a, b);
}

export function notesForWorkspace(
  notes: Record<string, Note>,
  workspaceId: string,
): Record<string, Note> {
  const scoped: Record<string, Note> = {};
  for (const [id, note] of Object.entries(notes)) {
    if (note.workspaceId === workspaceId) scoped[id] = note;
  }
  return scoped;
}

export function workspaceList(workspaces: Record<string, Workspace>): Workspace[] {
  return Object.values(workspaces).sort((a, b) => {
    if (a.id === DEFAULT_WORKSPACE_ID) return -1;
    if (b.id === DEFAULT_WORKSPACE_ID) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function noteCountInWorkspace(notes: Record<string, Note>, workspaceId: string): number {
  return liveNotes(notesForWorkspace(notes, workspaceId)).length;
}

export function liveNotes(notes: Record<string, Note>): Note[] {
  return Object.values(notes)
    .filter((note) => !note.deletedAt && !note.archived)
    .sort(pinnedFirst);
}

export function archivedNotes(notes: Record<string, Note>): Note[] {
  return Object.values(notes)
    .filter((note) => !note.deletedAt && note.archived)
    .sort((a, b) => (b.archivedAt ?? b.updatedAt) - (a.archivedAt ?? a.updatedAt));
}

export function editorNotes(notes: Record<string, Note>): Note[] {
  return liveNotes(notes).filter((note) => note.kind !== "promptCard");
}

export function promptCards(notes: Record<string, Note>): Note[] {
  return liveNotes(notes).filter((note) => note.kind === "promptCard");
}

/** Quiet for a week — shown on the Suggestions page. */
export const INACTIVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function lastActiveAt(note: Note): number {
  return Math.max(note.updatedAt, note.openedAt || 0);
}

export function inactiveNotes(notes: Record<string, Note>, now = Date.now()): Note[] {
  return editorNotes(notes)
    .filter((note) => now - lastActiveAt(note) >= INACTIVE_AFTER_MS)
    .sort((a, b) => lastActiveAt(a) - lastActiveAt(b));
}

const SUGGEST_THEMES: NoteTheme[] = ["azure", "sage", "sand", "aurora"];

/** Stable color for a suggestion card — not the note's own paper theme. */
export function suggestionTheme(note: Note): NoteTheme {
  let n = 0;
  for (let i = 0; i < note.id.length; i += 1) {
    n = (n + note.id.charCodeAt(i) * (i + 1)) % SUGGEST_THEMES.length;
  }
  return SUGGEST_THEMES[n];
}

export function quietDays(note: Note, now = Date.now()): number {
  return Math.max(7, Math.floor((now - lastActiveAt(note)) / 86_400_000));
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
    const haystack = `${note.title}\n${note.subtitle}\n${note.text}\n${note.tags.join(" ")}\n${note.kind}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function noteLabel(note: Note): string {
  if (note.title.trim()) return note.title.trim();
  const line = note.text.split("\n").find((value) => value.trim().length > 0);
  if (line?.trim()) return line.trim();
  if (note.kind === "promptCard") return "Untitled prompt card";
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

/** Unique bundles across live notes, sorted by most recently updated with usage counts. */
export function collectBundles(
  notes: Record<string, Note>,
): Array<{ name: string; count: number; updatedAt: number; latestNote?: Note }> {
  const map = new Map<string, { name: string; count: number; updatedAt: number; latestNote?: Note }>();
  for (const note of liveNotes(notes)) {
    if (!note.bundle) continue;
    const name = note.bundle.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (note.updatedAt > existing.updatedAt) {
        existing.updatedAt = note.updatedAt;
        existing.latestNote = note;
      }
    } else {
      map.set(key, { name, count: 1, updatedAt: note.updatedAt, latestNote: note });
    }
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function notesForBundle(notes: Record<string, Note>, bundleName: string): Note[] {
  const key = bundleName.trim().toLowerCase();
  return liveNotes(notes).filter((note) => note.bundle?.trim().toLowerCase() === key);
}

export function normalizeBundleName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 60);
}

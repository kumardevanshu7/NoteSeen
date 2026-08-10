import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { NsFileHandle } from "./fs";
import type { Note } from "./types";

const DB_NAME = "noteseen";
const DB_VERSION = 1;

interface NoteSeenDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { "by-updatedAt": number };
  };
  /**
   * File System Access handles are structured-cloneable, so a note opened from
   * disk can be written straight back to the same file in later sessions.
   */
  handles: {
    key: string;
    value: NsFileHandle;
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<NoteSeenDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<NoteSeenDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const notes = database.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("by-updatedAt", "updatedAt");
        database.createObjectStore("handles");
        database.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function loadNotes(): Promise<Note[]> {
  return (await db()).getAll("notes");
}

export async function saveNotes(notes: Note[]): Promise<void> {
  if (notes.length === 0) return;
  const database = await db();
  const tx = database.transaction("notes", "readwrite");
  await Promise.all([...notes.map((note) => tx.store.put(note)), tx.done]);
}

export async function removeNote(id: string): Promise<void> {
  const database = await db();
  await database.delete("notes", id);
  await database.delete("handles", id);
}

export async function removeNotes(ids: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(["notes", "handles"], "readwrite");
  await Promise.all([
    ...ids.map((id) => tx.objectStore("notes").delete(id)),
    ...ids.map((id) => tx.objectStore("handles").delete(id)),
    tx.done,
  ]);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get("meta", key) as Promise<T | undefined>;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put("meta", value, key);
}

export async function putFileHandle(noteId: string, handle: NsFileHandle): Promise<void> {
  await (await db()).put("handles", handle, noteId);
}

export async function getFileHandle(noteId: string): Promise<NsFileHandle | undefined> {
  return (await db()).get("handles", noteId);
}

export async function loadFileHandles(): Promise<Record<string, NsFileHandle>> {
  const database = await db();
  const [keys, values] = await Promise.all([
    database.getAllKeys("handles"),
    database.getAll("handles"),
  ]);
  const map: Record<string, NsFileHandle> = {};
  keys.forEach((key, index) => {
    const handle = values[index];
    if (handle) map[String(key)] = handle;
  });
  return map;
}

export async function deleteFileHandle(noteId: string): Promise<void> {
  await (await db()).delete("handles", noteId);
}

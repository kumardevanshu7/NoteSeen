import type { Note } from "@/lib/types";

/**
 * Seam for remote sync. NoteSeen is local-first: IndexedDB is the source of
 * truth and the UI never waits on a network call. A backend (Firebase or
 * anything else) plugs in here without touching the editor or the store.
 *
 * Implement this interface, then call `setSyncAdapter(yourAdapter)` once during
 * startup. `pushNotes` is called after a local save settles; `subscribe` should
 * hand back remote changes so they can be merged.
 */
export interface SyncAdapter {
  readonly id: string;
  /** Resolves once the adapter is authenticated and ready. */
  connect(): Promise<void>;
  /** Called with notes that changed locally. */
  pushNotes(notes: Note[]): Promise<void>;
  /** Called when a note is permanently removed locally. */
  removeNotes(ids: string[]): Promise<void>;
  /** Stream of remote changes. Return an unsubscribe function. */
  subscribe(onRemoteNotes: (notes: Note[]) => void): () => void;
  /** Flush any debounced cloud writes immediately (used on sign-out). */
  flushCloud?(): Promise<void>;
}

const localOnly: SyncAdapter = {
  id: "local-only",
  async connect() {},
  async pushNotes() {},
  async removeNotes() {},
  subscribe() {
    return () => {};
  },
};

let current: SyncAdapter = localOnly;

export function setSyncAdapter(adapter: SyncAdapter): void {
  current = adapter;
}

export function syncAdapter(): SyncAdapter {
  return current;
}

/**
 * Last-write-wins on `updatedAt`. Good enough for a single user across devices;
 * swap in a smarter merge when collaborative editing arrives.
 */
export function mergeRemote(local: Note | undefined, remote: Note): Note {
  if (!local) return remote;
  return remote.updatedAt > local.updatedAt ? remote : local;
}

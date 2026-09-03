import type { Bundle, Note, Workspace } from "@/lib/types";

/**
 * Seam for remote sync. NoteSeen is local-first: IndexedDB is the source of
 * truth and the UI never waits on a network call.
 */
export interface SyncAdapter {
  readonly id: string;
  connect(): Promise<void>;
  /** One-shot pull before live subscribe (avoids push-over-remote race). */
  pullNotes?(): Promise<Note[]>;
  pullWorkspaces?(): Promise<Workspace[]>;
  pullBundles?(): Promise<Bundle[]>;
  pushNotes(notes: Note[], immediate?: boolean): Promise<void>;
  pushWorkspaces?(workspaces: Workspace[], immediate?: boolean): Promise<void>;
  pushBundles?(bundles: Bundle[], immediate?: boolean): Promise<void>;
  removeNotes(ids: string[]): Promise<void>;
  removeWorkspaces?(ids: string[]): Promise<void>;
  removeBundles?(ids: string[]): Promise<void>;
  subscribe(onRemoteNotes: (notes: Note[]) => void): () => void;
  subscribeWorkspaces?(onRemote: (workspaces: Workspace[]) => void): () => void;
  subscribeBundles?(onRemote: (bundles: Bundle[]) => void): () => void;
  flushCloud?(): Promise<void>;
}

const localOnly: SyncAdapter = {
  id: "local-only",
  async connect() {},
  async pullNotes() {
    return [];
  },
  async pullWorkspaces() {
    return [];
  },
  async pullBundles() {
    return [];
  },
  async pushNotes() {},
  async pushWorkspaces() {},
  async pushBundles() {},
  async removeNotes() {},
  async removeWorkspaces() {},
  async removeBundles() {},
  subscribe() {
    return () => {};
  },
  subscribeWorkspaces() {
    return () => {};
  },
  subscribeBundles() {
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
 * Last-write-wins on updatedAt. Soft-deletes win when their stamp is newer
 * than the other side's updatedAt (even if updatedAt was forgotten historically).
 */
export function mergeRemote(local: Note | undefined, remote: Note): Note {
  if (!local) return remote;

  const localDelete = local.deletedAt ?? 0;
  const remoteDelete = remote.deletedAt ?? 0;
  const localStamp = Math.max(local.updatedAt, localDelete);
  const remoteStamp = Math.max(remote.updatedAt, remoteDelete);

  if (remoteStamp > localStamp) return remote;
  if (localStamp > remoteStamp) return local;

  // Tie-break: prefer deleted over live so trash syncs across devices.
  if (remoteDelete && !localDelete) return remote;
  if (localDelete && !remoteDelete) return local;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

export function mergeRemoteWorkspace(local: Workspace | undefined, remote: Workspace): Workspace {
  if (!local) return remote;
  if (remote.updatedAt > local.updatedAt) return remote;
  if (local.updatedAt > remote.updatedAt) return local;
  return remote;
}

export function mergeRemoteBundle(local: Bundle | undefined, remote: Bundle): Bundle {
  if (!local) return remote;
  if (remote.updatedAt > local.updatedAt) return remote;
  if (local.updatedAt > remote.updatedAt) return local;
  return remote;
}

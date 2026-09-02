import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Note, Workspace } from "@/lib/types";
import { normalizeNote, normalizeWorkspace } from "@/lib/types";
import { type SyncAdapter } from "./adapter";

/** Fast enough to feel instant; still batches rapid keystrokes. */
const CLOUD_PUSH_DEBOUNCE_MS = 100;

type NoteDoc = Omit<Note, "fileName"> & { fileName?: string | null };

function notesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "notes");
}

function noteDoc(uid: string, noteId: string) {
  return doc(getFirebaseDb(), "users", uid, "notes", noteId);
}

function workspacesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "workspaces");
}

function workspaceDoc(uid: string, workspaceId: string) {
  return doc(getFirebaseDb(), "users", uid, "workspaces", workspaceId);
}

function toDoc(note: Note): NoteDoc {
  return {
    id: note.id,
    kind: note.kind,
    workspaceId: note.workspaceId,
    title: note.title,
    subtitle: note.subtitle,
    tags: note.tags,
    html: note.html,
    text: note.text,
    coverUrl: note.coverUrl,
    theme: note.theme,
    typeface: note.typeface,
    size: note.size,
    spacing: note.spacing,
    pinned: note.pinned,
    bundle: note.bundle ?? null,
    completed: note.completed ?? false,
    completedAt: note.completedAt ?? null,
    archived: note.archived ?? false,
    archivedAt: note.archivedAt ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    openedAt: note.openedAt,
    deletedAt: note.deletedAt,
    fileName: note.fileName,
  };
}

function fromDoc(data: NoteDoc, fallbackId: string): Note {
  return normalizeNote({
    ...(data as Note),
    id: data.id || fallbackId,
  });
}

/**
 * Firestore sync for a single Google-signed-in user.
 * Local IndexedDB remains the source of truth; cloud writes are debounced.
 */
export function createFirestoreAdapter(): SyncAdapter {
  let unsubscribe: Unsubscribe | null = null;
  let unsubscribeWorkspaces: Unsubscribe | null = null;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let workspacePushTimer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Map<string, Note>();
  const pendingWorkspaces = new Map<string, Workspace>();
  let connectedUid: string | null = null;
  /** Remote ids seen on the last full snapshot — used to detect hard deletes. */
  let knownRemoteIds = new Set<string>();

  async function flushPendingWorkspaces() {
    if (workspacePushTimer) {
      clearTimeout(workspacePushTimer);
      workspacePushTimer = null;
    }
    const uid = connectedUid ?? getFirebaseAuth().currentUser?.uid;
    if (!uid || pendingWorkspaces.size === 0) return;

    const entries = [...pendingWorkspaces.entries()];
    pendingWorkspaces.clear();

    for (let i = 0; i < entries.length; i += 450) {
      const slice = entries.slice(i, i + 450);
      const chunk = writeBatch(getFirebaseDb());
      for (const [id, workspace] of slice) {
        chunk.set(workspaceDoc(uid, id), workspace, { merge: true });
      }
      await chunk.commit();
    }
  }

  async function flushPending() {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    const uid = connectedUid ?? getFirebaseAuth().currentUser?.uid;
    if (!uid || pending.size === 0) return;

    const entries = [...pending.entries()];
    pending.clear();

    for (let i = 0; i < entries.length; i += 450) {
      const slice = entries.slice(i, i + 450);
      const chunk = writeBatch(getFirebaseDb());
      for (const [id, note] of slice) {
        chunk.set(noteDoc(uid, id), toDoc(note), { merge: true });
      }
      await chunk.commit();
    }
  }

  function schedulePush(notes: Note[], immediate = false) {
    for (const note of notes) pending.set(note.id, note);
    if (pushTimer) clearTimeout(pushTimer);
    if (immediate) {
      void flushPending().catch((error) => {
        console.error("NoteSeen: Firestore push failed", error);
      });
      return;
    }
    pushTimer = setTimeout(() => {
      void flushPending().catch((error) => {
        console.error("NoteSeen: Firestore push failed", error);
      });
    }, CLOUD_PUSH_DEBOUNCE_MS);
  }

  function scheduleWorkspacePush(workspaces: Workspace[], immediate = false) {
    for (const ws of workspaces) pendingWorkspaces.set(ws.id, ws);
    if (workspacePushTimer) clearTimeout(workspacePushTimer);
    if (immediate) {
      void flushPendingWorkspaces().catch((error) => {
        console.error("NoteSeen: Firestore workspace push failed", error);
      });
      return;
    }
    workspacePushTimer = setTimeout(() => {
      void flushPendingWorkspaces().catch((error) => {
        console.error("NoteSeen: Firestore workspace push failed", error);
      });
    }, CLOUD_PUSH_DEBOUNCE_MS);
  }

  async function readAllWorkspaces(uid: string): Promise<Workspace[]> {
    const snapshot = await getDocs(workspacesCol(uid));
    return snapshot.docs.map((entry) =>
      normalizeWorkspace({ ...(entry.data() as Workspace), id: entry.id }),
    );
  }

  async function readAllNotes(uid: string): Promise<Note[]> {
    const snapshot = await getDocs(notesCol(uid));
    const notes = snapshot.docs.map((entry) => fromDoc(entry.data() as NoteDoc, entry.id));
    knownRemoteIds = new Set(notes.map((note) => note.id));
    return notes;
  }

  return {
    id: "firestore",

    async connect() {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        connectedUid = null;
        throw new Error("Sign in with Google before connecting sync.");
      }
      connectedUid = user.uid;
      await setDoc(
        doc(getFirebaseDb(), "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    },

    async pullWorkspaces() {
      const uid = connectedUid ?? getFirebaseAuth().currentUser?.uid;
      if (!uid) return [];
      return readAllWorkspaces(uid);
    },

    async pushWorkspaces(workspaces, immediate = false) {
      if (!getFirebaseAuth().currentUser) return;
      scheduleWorkspacePush(workspaces, immediate);
    },

    async removeWorkspaces(ids) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid || ids.length === 0) return;
      for (const id of ids) pendingWorkspaces.delete(id);
      for (let i = 0; i < ids.length; i += 450) {
        const slice = ids.slice(i, i + 450);
        const batch = writeBatch(getFirebaseDb());
        for (const id of slice) batch.delete(workspaceDoc(uid, id));
        await batch.commit();
      }
    },

    async pullNotes() {
      const uid = connectedUid ?? getFirebaseAuth().currentUser?.uid;
      if (!uid) return [];
      return readAllNotes(uid);
    },

    async pushNotes(notes, immediate = false) {
      if (!getFirebaseAuth().currentUser) return;
      const urgent = immediate || notes.some((note) => note.deletedAt != null);
      schedulePush(notes, urgent);
    },

    async removeNotes(ids) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid || ids.length === 0) return;
      for (const id of ids) {
        pending.delete(id);
        knownRemoteIds.delete(id);
      }
      for (let i = 0; i < ids.length; i += 450) {
        const slice = ids.slice(i, i + 450);
        const batch = writeBatch(getFirebaseDb());
        for (const id of slice) batch.delete(noteDoc(uid, id));
        await batch.commit();
      }
    },

    async flushCloud() {
      await Promise.all([flushPending(), flushPendingWorkspaces()]);
    },

    subscribeWorkspaces(onRemoteWorkspaces) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return () => {};

      if (unsubscribeWorkspaces) {
        unsubscribeWorkspaces();
        unsubscribeWorkspaces = null;
      }

      unsubscribeWorkspaces = onSnapshot(
        workspacesCol(uid),
        (snapshot) => {
          const workspaces = snapshot.docs.map((entry) =>
            normalizeWorkspace({ ...(entry.data() as Workspace), id: entry.id }),
          );
          onRemoteWorkspaces(workspaces);
        },
        (error) => {
          console.error("NoteSeen: Firestore workspace listener error", error);
        },
      );

      return () => {
        unsubscribeWorkspaces?.();
        unsubscribeWorkspaces = null;
      };
    },

    subscribe(onRemoteNotes) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return () => {};

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      unsubscribe = onSnapshot(
        notesCol(uid),
        (snapshot) => {
          const notes = snapshot.docs.map((entry) =>
            fromDoc(entry.data() as NoteDoc, entry.id),
          );
          const nextIds = new Set(notes.map((note) => note.id));
          // Surface hard-deletes as soft-deleted stubs so devices drop them from live lists.
          const removed: Note[] = [];
          for (const id of knownRemoteIds) {
            if (nextIds.has(id)) continue;
            removed.push(
              normalizeNote({
                id,
                title: "",
                html: "<p></p>",
                text: "",
                deletedAt: Date.now(),
                updatedAt: Date.now(),
                createdAt: Date.now(),
              }),
            );
          }
          knownRemoteIds = nextIds;
          onRemoteNotes(removed.length > 0 ? [...notes, ...removed] : notes);
        },
        (error) => {
          console.error("NoteSeen: Firestore listener error", error);
        },
      );

      return () => {
        unsubscribe?.();
        unsubscribe = null;
        unsubscribeWorkspaces?.();
        unsubscribeWorkspaces = null;
        if (pushTimer) {
          clearTimeout(pushTimer);
          pushTimer = null;
        }
        if (workspacePushTimer) {
          clearTimeout(workspacePushTimer);
          workspacePushTimer = null;
        }
        connectedUid = null;
        knownRemoteIds = new Set();
      };
    },
  };
}

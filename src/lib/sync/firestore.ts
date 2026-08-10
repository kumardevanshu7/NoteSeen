import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Note } from "@/lib/types";
import { normalizeNote } from "@/lib/types";
import { type SyncAdapter } from "./adapter";

const CLOUD_PUSH_DEBOUNCE_MS = 3500;

type NoteDoc = Omit<Note, "fileName"> & { fileName?: string | null };

function notesCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "notes");
}

function noteDoc(uid: string, noteId: string) {
  return doc(getFirebaseDb(), "users", uid, "notes", noteId);
}

function toDoc(note: Note): NoteDoc {
  // File System handles stay local — never upload them.
  return {
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
    pinned: note.pinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
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
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Map<string, Note>();
  let connectedUid: string | null = null;

  async function flushPending() {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    const uid = connectedUid ?? getFirebaseAuth().currentUser?.uid;
    if (!uid || pending.size === 0) return;

    const entries = [...pending.entries()];
    pending.clear();

    // Firestore batches max out at 500 ops.
    for (let i = 0; i < entries.length; i += 450) {
      const slice = entries.slice(i, i + 450);
      const chunk = writeBatch(getFirebaseDb());
      for (const [id, note] of slice) {
        chunk.set(noteDoc(uid, id), toDoc(note), { merge: true });
      }
      await chunk.commit();
    }
  }

  function schedulePush(notes: Note[]) {
    for (const note of notes) pending.set(note.id, note);
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      void flushPending().catch((error) => {
        console.error("NoteSeen: Firestore push failed", error);
      });
    }, CLOUD_PUSH_DEBOUNCE_MS);
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

    async pushNotes(notes) {
      if (!getFirebaseAuth().currentUser) return;
      schedulePush(notes);
    },

    async removeNotes(ids) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid || ids.length === 0) return;
      for (const id of ids) pending.delete(id);
      for (let i = 0; i < ids.length; i += 450) {
        const slice = ids.slice(i, i + 450);
        const batch = writeBatch(getFirebaseDb());
        for (const id of slice) batch.delete(noteDoc(uid, id));
        await batch.commit();
      }
    },

    async flushCloud() {
      await flushPending();
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
          onRemoteNotes(notes);
        },
        (error) => {
          console.error("NoteSeen: Firestore listener error", error);
        },
      );

      return () => {
        unsubscribe?.();
        unsubscribe = null;
        if (pushTimer) {
          clearTimeout(pushTimer);
          pushTimer = null;
        }
        connectedUid = null;
      };
    },
  };
}

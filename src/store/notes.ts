import { nanoid } from "nanoid";
import { toast } from "sonner";
import { create } from "zustand";
import {
  deleteFileHandle,
  getMeta,
  loadFileHandles,
  loadNotes,
  loadWorkspaces,
  putFileHandle,
  removeNote,
  removeNotes,
  removeWorkspace,
  saveNotes,
  saveWorkspaces,
  setMeta,
} from "@/lib/db";
import { isAbortError, supportsFileSystemAccess, type NsFileHandle } from "@/lib/fs";
import {
  downloadNote,
  pickSaveTarget,
  readNoteFile,
  writeNoteToHandle,
  type ImportedNote,
} from "@/lib/note-file";
import { mergeRemote, mergeRemoteWorkspace, syncAdapter } from "@/lib/sync/adapter";
import type { Note, NoteKind, SaveStatus, View, Workspace, WorkspaceColor } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID, defaultWorkspace, normalizeNote, normalizeWorkspace } from "@/lib/types";
import { htmlToPlainText } from "@/lib/utils";
import { requireVault } from "@/store/vault";
import { useSecrets } from "@/store/secrets";

const IDB_DEBOUNCE_MS = 250;
const FILE_DEBOUNCE_MS = 1200;
const SNAPSHOT_KEY = "noteseen.snapshot";
const ACTIVE_KEY = "activeNoteId";
const TABS_KEY = "openTabs";
const WORKSPACE_KEY = "activeWorkspaceId";
const MAX_OPEN_TABS = 12;

function withOpenTab(tabs: string[], id: string | null): string[] {
  if (!id) return tabs;
  if (tabs.includes(id)) return tabs;
  return [...tabs, id].slice(-MAX_OPEN_TABS);
}

function withoutTabs(tabs: string[], gone: Iterable<string>): string[] {
  const drop = new Set(gone);
  return tabs.filter((id) => !drop.has(id));
}

function nextTabAfterClose(tabs: string[], closingId: string): string | null {
  const index = tabs.indexOf(closingId);
  const remaining = tabs.filter((id) => id !== closingId);
  if (index < 0) return remaining[0] ?? null;
  return remaining[index] ?? remaining[index - 1] ?? null;
}

interface Snapshot {
  id: string;
  title: string;
  html: string;
  updatedAt: number;
}

function emptyNote(seed: Partial<Note> = {}): Note {
  const now = Date.now();
  return normalizeNote({
    id: nanoid(12),
    kind: "note",
    title: "",
    tags: [],
    html: "<p></p>",
    text: "",
    theme: "plain",
    typeface: "inter",
    size: "m",
    spacing: "normal",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    fileName: null,
    ...seed,
  });
}

function welcomeNote(): Note {
  return emptyNote({
    title: "Welcome to NoteSeen",
    html: `<p>This is a scratchpad that behaves like a notepad: start typing, walk away, and it is already saved.</p>
<h2>Three things worth knowing</h2>
<ul>
<li><p><strong>Nothing to save.</strong> Every keystroke is written locally, and closing the tab flushes the last edit.</p></li>
<li><p><strong>Your notes are files.</strong> Press <code>Ctrl</code> + <code>S</code> to keep a note as a <code>.noteseen</code> file on disk. Reopen it any time — double-click it once NoteSeen is installed.</p></li>
<li><p><strong>Works offline.</strong> Install it from the address bar and it opens with no network at all.</p></li>
</ul>
<h2>Shortcuts</h2>
<ul>
<li><p><code>Ctrl</code> + <code>N</code> — new note</p></li>
<li><p><code>Ctrl</code> + <code>K</code> — jump to any note</p></li>
<li><p><code>Ctrl</code> + <code>S</code> — save as a <code>.noteseen</code> file</p></li>
<li><p><code>Ctrl</code> + <code>O</code> — open a file from disk</p></li>
</ul>
<p>Delete this note whenever you like — it lands in Trash first.</p>`,
    text: "",
  });
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

/**
 * Synchronous crash net. IndexedDB writes are async and can be cut short when a
 * tab is killed, so the in-flight note is also mirrored into localStorage.
 */
function writeSnapshot(note: Note): void {
  try {
    const snapshot: Snapshot = {
      id: note.id,
      title: note.title,
      html: note.html,
      updatedAt: note.updatedAt,
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: IndexedDB remains the primary store.
  }
}

function clearSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

interface NotesState {
  ready: boolean;
  notes: Record<string, Note>;
  workspaces: Record<string, Workspace>;
  activeWorkspaceId: string;
  handles: Record<string, NsFileHandle>;
  activeId: string | null;
  /** Recently opened notes, Chrome-tab style — most recent first. */
  openTabs: string[];
  view: View;
  query: string;
  status: SaveStatus;
  lastSavedAt: number | null;
  /** Firebase Auth uid when cloud sync is live; null when local-only. */
  cloudUserId: string | null;

  init: () => Promise<void>;
  createWorkspace: (name: string, color?: WorkspaceColor) => string;
  renameWorkspace: (id: string, name: string, color?: WorkspaceColor) => void;
  deleteWorkspace: (id: string) => Promise<boolean>;
  setActiveWorkspace: (id: string) => void;
  moveNotesToWorkspace: (ids: string[], workspaceId: string) => number;
  createNote: (seed?: Partial<Note>) => string;
  createItem: (kind: NoteKind) => string;
  openForEdit: (id: string) => Promise<boolean>;
  patchNote: (id: string, patch: Partial<Note>, options?: { touch?: boolean }) => void;
  setActive: (id: string | null) => void;
  closeTab: (id: string) => void;
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  togglePin: (id: string) => void;
  duplicateNote: (id: string) => string | null;
  trashNote: (id: string) => Promise<boolean>;
  trashNotes: (ids: string[]) => Promise<boolean>;
  restoreNote: (id: string) => void;
  purgeNote: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  /** Rename a label on every live note that uses it (vault required by caller). */
  renameLabel: (from: string, to: string) => number;
  /** Remove a label from every live note that uses it (vault required by caller). */
  removeLabel: (label: string) => number;

  flush: (options?: { toDisk?: boolean }) => Promise<void>;
  saveToFile: (id: string, options?: { forcePicker?: boolean }) => Promise<void>;
  unlinkFile: (id: string) => Promise<void>;
  importHandles: (handles: NsFileHandle[]) => Promise<string | null>;
  importFiles: (files: File[]) => Promise<string | null>;

  setCloudUser: (uid: string | null) => void;
  mergeRemoteNotes: (remoteNotes: Note[]) => void;
  mergeRemoteWorkspaces: (remoteWorkspaces: Workspace[]) => void;
  pushAllToCloud: () => Promise<void>;
}

const dirtyNotes = new Set<string>();
const dirtyWorkspaces = new Set<string>();
const dirtyFiles = new Set<string>();
let idbTimer: ReturnType<typeof setTimeout> | null = null;
let fileTimer: ReturnType<typeof setTimeout> | null = null;
let permissionWarned = false;
/** Guards against React's double-invoked effects seeding the store twice. */
let initPromise: Promise<void> | null = null;

export const useNotes = create<NotesState>((set, get) => {
  function scheduleIdb() {
    if (idbTimer) clearTimeout(idbTimer);
    set({ status: "saving" });
    idbTimer = setTimeout(() => {
      idbTimer = null;
      void get().flush({ toDisk: false });
    }, IDB_DEBOUNCE_MS);
  }

  function scheduleWorkspaceIdb(id: string) {
    dirtyWorkspaces.add(id);
    scheduleIdb();
  }

  function scheduleFile(id: string) {
    if (!get().handles[id]) return;
    dirtyFiles.add(id);
    if (fileTimer) clearTimeout(fileTimer);
    fileTimer = setTimeout(() => {
      fileTimer = null;
      void get().flush({ toDisk: true });
    }, FILE_DEBOUNCE_MS);
  }

  async function writeLinkedFiles(ids: string[]) {
    const { notes, handles } = get();
    for (const id of ids) {
      const note = notes[id];
      const handle = handles[id];
      if (!note || !handle) continue;
      try {
        const written = await writeNoteToHandle(handle, note);
        if (!written && !permissionWarned) {
          permissionWarned = true;
          toast.warning("File access needs your permission", {
            description: `${handle.name} is not being updated until you allow write access.`,
          });
        }
      } catch {
        if (!permissionWarned) {
          permissionWarned = true;
          toast.error("Could not update the linked file", {
            description: `${handle.name} stayed unchanged. The note is still saved in the app.`,
          });
        }
      }
    }
  }

  function insertImported(imported: ImportedNote, handle?: NsFileHandle): string {
    const note = emptyNote({
      title: imported.title,
      html: imported.html,
      text: imported.text || htmlToPlainText(imported.html),
      kind: imported.kind ?? "note",
      tags: imported.tags ?? [],
      theme: imported.theme ?? "plain",
      typeface: imported.typeface ?? "inter",
      size: imported.size ?? "m",
      spacing: imported.spacing ?? "normal",
      createdAt: imported.createdAt ?? Date.now(),
      updatedAt: imported.updatedAt ?? Date.now(),
      fileName: imported.fileName,
    });

    set((state) => ({
      notes: { ...state.notes, [note.id]: note },
      handles: handle ? { ...state.handles, [note.id]: handle } : state.handles,
      activeId: note.id,
      openTabs: withOpenTab(state.openTabs, note.id),
      view: "editor",
    }));

    dirtyNotes.add(note.id);
    scheduleIdb();
    void setMeta(TABS_KEY, get().openTabs);
    if (handle) void putFileHandle(note.id, handle);
    return note.id;
  }

  async function loadEverything() {
    const [stored, storedWorkspaces, handles, activeId, storedTabs, storedWorkspaceId] =
      await Promise.all([
        loadNotes(),
        loadWorkspaces(),
        loadFileHandles(),
        getMeta<string>(ACTIVE_KEY),
        getMeta<string[]>(TABS_KEY),
        getMeta<string>(WORKSPACE_KEY),
      ]);

    const notes: Record<string, Note> = {};
    for (const note of stored) notes[note.id] = normalizeNote(note);

    const workspaces: Record<string, Workspace> = {};
    for (const ws of storedWorkspaces) workspaces[ws.id] = normalizeWorkspace(ws);
    if (!workspaces[DEFAULT_WORKSPACE_ID]) {
      workspaces[DEFAULT_WORKSPACE_ID] = defaultWorkspace();
      dirtyWorkspaces.add(DEFAULT_WORKSPACE_ID);
    }

    for (const [id, note] of Object.entries(notes)) {
      if (note.workspaceId !== DEFAULT_WORKSPACE_ID && !workspaces[note.workspaceId]) {
        notes[id] = { ...note, workspaceId: DEFAULT_WORKSPACE_ID };
        dirtyNotes.add(id);
      }
    }

    const snapshot = readSnapshot();
    if (snapshot && notes[snapshot.id] && snapshot.updatedAt > notes[snapshot.id].updatedAt) {
      notes[snapshot.id] = {
        ...notes[snapshot.id],
        title: snapshot.title,
        html: snapshot.html,
        text: htmlToPlainText(snapshot.html),
        updatedAt: snapshot.updatedAt,
      };
      dirtyNotes.add(snapshot.id);
    }
    clearSnapshot();

    if (Object.keys(notes).length === 0) {
      const welcome = welcomeNote();
      welcome.text = htmlToPlainText(welcome.html);
      notes[welcome.id] = welcome;
      dirtyNotes.add(welcome.id);
    }

    const activeWorkspaceId =
      storedWorkspaceId && workspaces[storedWorkspaceId]
        ? storedWorkspaceId
        : DEFAULT_WORKSPACE_ID;

    const live = Object.values(notes)
      .filter((note) => !note.deletedAt && note.workspaceId === activeWorkspaceId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const resolvedActive =
      activeId && notes[activeId] && !notes[activeId].deletedAt ? activeId : (live[0]?.id ?? null);
    const liveIds = new Set(
      Object.values(notes)
        .filter((note) => !note.deletedAt)
        .map((note) => note.id),
    );
    const openTabs = withOpenTab(
      (Array.isArray(storedTabs) ? storedTabs : []).filter((id) => liveIds.has(id)),
      resolvedActive,
    );

    set({
      notes,
      workspaces,
      activeWorkspaceId,
      handles,
      activeId: resolvedActive,
      openTabs,
      ready: true,
      view: "suggestions",
    });
    void setMeta(TABS_KEY, openTabs);
    if (dirtyNotes.size > 0) void get().flush({ toDisk: false });
  }

  return {
    ready: false,
    notes: {},
    workspaces: { [DEFAULT_WORKSPACE_ID]: defaultWorkspace() },
    activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    handles: {},
    activeId: null,
    openTabs: [],
    view: "suggestions",
    query: "",
    status: "idle",
    lastSavedAt: null,
    cloudUserId: null,

    init() {
      initPromise ??= loadEverything();
      return initPromise;
    },

    createWorkspace(name, color = "azure") {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) return DEFAULT_WORKSPACE_ID;
      const now = Date.now();
      const workspace = normalizeWorkspace({
        id: nanoid(12),
        name: trimmed,
        color,
        createdAt: now,
        updatedAt: now,
      });
      set((state) => ({
        workspaces: { ...state.workspaces, [workspace.id]: workspace },
        activeWorkspaceId: workspace.id,
        query: "",
        view: "suggestions",
      }));
      scheduleWorkspaceIdb(workspace.id);
      void setMeta(WORKSPACE_KEY, workspace.id);
      return workspace.id;
    },

    renameWorkspace(id, name, color) {
      const trimmed = name.trim().slice(0, 80);
      const current = get().workspaces[id];
      if (!current || !trimmed) return;
      const nextColor = color ?? current.color;
      if (trimmed === current.name && nextColor === current.color) return;
      const next = { ...current, name: trimmed, color: nextColor, updatedAt: Date.now() };
      set((state) => ({ workspaces: { ...state.workspaces, [id]: next } }));
      scheduleWorkspaceIdb(id);
    },

    async deleteWorkspace(id) {
      if (id === DEFAULT_WORKSPACE_ID) return false;
      const ok = await requireVault("delete");
      if (!ok) return false;

      const { notes, workspaces, activeWorkspaceId } = get();
      if (!workspaces[id]) return false;

      const stamp = Date.now();
      const nextNotes = { ...notes };
      for (const [noteId, note] of Object.entries(nextNotes)) {
        if (note.workspaceId !== id) continue;
        nextNotes[noteId] = { ...note, workspaceId: DEFAULT_WORKSPACE_ID, updatedAt: stamp };
        dirtyNotes.add(noteId);
      }

      const nextWorkspaces = { ...workspaces };
      delete nextWorkspaces[id];

      set({
        notes: nextNotes,
        workspaces: nextWorkspaces,
        activeWorkspaceId: activeWorkspaceId === id ? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
      });

      scheduleIdb();
      dirtyWorkspaces.delete(id);
      await removeWorkspace(id);
      await useSecrets.getState().moveSecretsToWorkspace(id, DEFAULT_WORKSPACE_ID);
      if (get().cloudUserId) {
        void syncAdapter().removeWorkspaces?.([id]);
        void get().flush({ toDisk: false });
      }
      if (activeWorkspaceId === id) {
        get().setActiveWorkspace(DEFAULT_WORKSPACE_ID);
      }
      toast.success("Workspace removed — notes moved to General");
      return true;
    },

    setActiveWorkspace(id) {
      const { workspaces, notes, openTabs, activeId } = get();
      if (!workspaces[id]) return;

      useSecrets.getState().lock();

      const inWorkspace = openTabs.filter((tabId) => notes[tabId]?.workspaceId === id);
      const nextActive =
        activeId && notes[activeId]?.workspaceId === id
          ? activeId
          : (inWorkspace[inWorkspace.length - 1] ?? null);

      set({
        activeWorkspaceId: id,
        query: "",
        activeId: nextActive,
        view: nextActive ? "editor" : "suggestions",
      });
      void setMeta(WORKSPACE_KEY, id);
    },

    moveNotesToWorkspace(ids, workspaceId) {
      const { workspaces, activeWorkspaceId, openTabs, activeId } = get();
      if (!workspaces[workspaceId]) return 0;

      const stamp = Date.now();
      let moved = 0;
      let nextTabs = openTabs;
      let nextActive = activeId;

      set((state) => {
        const notes = { ...state.notes };
        for (const id of ids) {
          const note = notes[id];
          if (!note || note.deletedAt || note.workspaceId === workspaceId) continue;
          notes[id] = { ...note, workspaceId, updatedAt: stamp };
          dirtyNotes.add(id);
          moved += 1;
          if (workspaceId !== activeWorkspaceId && nextTabs.includes(id)) {
            nextTabs = nextTabs.filter((tab) => tab !== id);
            if (nextActive === id) nextActive = nextTabs[nextTabs.length - 1] ?? null;
          }
        }
        return { notes, openTabs: nextTabs, activeId: nextActive };
      });

      if (moved > 0) {
        scheduleIdb();
        void setMeta(TABS_KEY, get().openTabs);
        if (nextActive !== activeId) void setMeta(ACTIVE_KEY, nextActive);
      }
      return moved;
    },

    createNote(seed) {
      const workspaceId = seed?.workspaceId ?? get().activeWorkspaceId ?? DEFAULT_WORKSPACE_ID;
      const note = emptyNote({ ...seed, workspaceId });
      const isCard = note.kind === "promptCard";
      set((state) => ({
        notes: { ...state.notes, [note.id]: note },
        activeId: isCard ? state.activeId : note.id,
        openTabs: isCard ? state.openTabs : withOpenTab(state.openTabs, note.id),
        view: isCard ? "cards" : "editor",
        query: isCard ? state.query : "",
      }));
      dirtyNotes.add(note.id);
      scheduleIdb();
      if (!isCard) {
        void setMeta(ACTIVE_KEY, note.id);
        void setMeta(TABS_KEY, get().openTabs);
      }
      return note.id;
    },

    createItem(kind) {
      if (kind === "promptCard") {
        set({ view: "cards" });
        return "";
      }
      return get().createNote({
        kind,
        title: "",
        tags: [],
        html: "<p></p>",
        text: "",
      });
    },

    async openForEdit(id) {
      const note = get().notes[id];
      if (!note || note.deletedAt) return false;
      const ok = await requireVault("edit");
      if (!ok) return false;
      get().setActive(id);
      return true;
    },

    patchNote(id, patch, options) {
      const current = get().notes[id];
      if (!current) return;

      const next: Note = {
        ...current,
        ...patch,
        updatedAt: options?.touch === false ? current.updatedAt : Date.now(),
      };
      if (patch.html !== undefined && patch.text === undefined) {
        next.text = htmlToPlainText(patch.html);
      }

      set((state) => ({ notes: { ...state.notes, [id]: next } }));
      writeSnapshot(next);
      dirtyNotes.add(id);
      scheduleIdb();
      scheduleFile(id);
    },

    setActive(id) {
      if (id) {
        const target = get().notes[id];
        if (target?.kind === "promptCard") {
          set({ view: "cards" });
          return;
        }
      }
      if (get().activeId === id && get().view === "editor") return;
      void get().flush({ toDisk: true });
      set((state) => ({
        activeId: id,
        view: "editor",
        openTabs: withOpenTab(state.openTabs, id),
      }));
      void setMeta(ACTIVE_KEY, id);
      void setMeta(TABS_KEY, get().openTabs);
      if (id) {
        const opened = get().notes[id];
        if (opened && Date.now() - (opened.openedAt || 0) > 60_000) {
          get().patchNote(id, { openedAt: Date.now() }, { touch: false });
        }
      }
    },

    closeTab(id) {
      const { openTabs, activeId, view } = get();
      if (!openTabs.includes(id)) return;
      const nextTabs = openTabs.filter((tab) => tab !== id);
      const nextActive = activeId === id ? nextTabAfterClose(openTabs, id) : activeId;
      set({
        openTabs: nextTabs,
        activeId: nextActive,
        view: activeId === id && !nextActive ? "all" : view,
      });
      void setMeta(TABS_KEY, nextTabs);
      if (nextActive !== activeId) void setMeta(ACTIVE_KEY, nextActive);
    },

    setView(view) {
      set({ view });
    },

    setQuery(query) {
      set({ query });
    },

    togglePin(id) {
      const note = get().notes[id];
      if (!note) return;
      get().patchNote(id, { pinned: !note.pinned }, { touch: false });
    },

    duplicateNote(id) {
      const note = get().notes[id];
      if (!note) return null;
      return get().createNote({
        kind: note.kind,
        title: note.title ? `${note.title} (copy)` : "",
        subtitle: note.subtitle,
        workspaceId: note.workspaceId,
        tags: [...note.tags],
        html: note.html,
        text: note.text,
        coverUrl: note.coverUrl,
        theme: note.theme,
        typeface: note.typeface,
        size: note.size,
        spacing: note.spacing,
      });
    },

    async trashNote(id) {
      return get().trashNotes([id]);
    },

    async trashNotes(ids) {
      const unique = [...new Set(ids)].filter((id) => get().notes[id] && !get().notes[id]?.deletedAt);
      if (unique.length === 0) return false;

      const ok = await requireVault("delete");
      if (!ok) return false;

      const stamp = Date.now();
      set((state) => {
        const notes = { ...state.notes };
        for (const id of unique) {
          const note = notes[id];
          if (!note) continue;
          notes[id] = { ...note, deletedAt: stamp, pinned: false, updatedAt: stamp };
        }
        const remaining = Object.values(notes)
          .filter((candidate) => !candidate.deletedAt)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        const nextTabs = withoutTabs(state.openTabs, unique);
        const activeGone = state.activeId ? unique.includes(state.activeId) : false;
        const nextActive = activeGone
          ? (nextTabAfterClose(state.openTabs, state.activeId!) ?? remaining[0]?.id ?? null)
          : state.activeId;
        return {
          notes,
          activeId: nextActive,
          openTabs: withOpenTab(nextTabs, nextActive),
        };
      });
      void setMeta(TABS_KEY, get().openTabs);
      void setMeta(ACTIVE_KEY, get().activeId);

      for (const id of unique) dirtyNotes.add(id);
      scheduleIdb();
      // Trash must hit the cloud quickly so other devices drop the note.
      void get()
        .flush({ toDisk: false })
        .then(() => syncAdapter().flushCloud?.());

      toast(unique.length === 1 ? "Moved to Trash" : `Moved ${unique.length} items to Trash`, {
        action:
          unique.length === 1
            ? { label: "Undo", onClick: () => get().restoreNote(unique[0]!) }
            : undefined,
      });
      return true;
    },

    restoreNote(id) {
      const note = get().notes[id];
      if (!note) return;
      const stamp = Date.now();
      set((state) => ({
        notes: {
          ...state.notes,
          [id]: { ...note, deletedAt: null, updatedAt: stamp },
        },
        activeId: id,
        openTabs: withOpenTab(state.openTabs, id),
        view: "editor",
      }));
      void setMeta(TABS_KEY, get().openTabs);
      void setMeta(ACTIVE_KEY, id);
      dirtyNotes.add(id);
      scheduleIdb();
      void get()
        .flush({ toDisk: false })
        .then(() => syncAdapter().flushCloud?.());
    },

    async purgeNote(id) {
      const ok = await requireVault("delete");
      if (!ok) return;

      const remaining = Object.values(get().notes)
        .filter((candidate) => candidate.id !== id && !candidate.deletedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt);

      set((state) => {
        const notes = { ...state.notes };
        const handles = { ...state.handles };
        delete notes[id];
        delete handles[id];
        const nextTabs = withoutTabs(state.openTabs, [id]);
        const nextActive =
          state.activeId === id
            ? (nextTabAfterClose(state.openTabs, id) ?? remaining[0]?.id ?? null)
            : state.activeId;
        return {
          notes,
          handles,
          activeId: nextActive,
          openTabs: withOpenTab(nextTabs, nextActive),
        };
      });
      void setMeta(TABS_KEY, get().openTabs);
      void setMeta(ACTIVE_KEY, get().activeId);
      dirtyNotes.delete(id);
      dirtyFiles.delete(id);
      await removeNote(id);
      void syncAdapter().removeNotes([id]);
    },

    async emptyTrash() {
      const workspaceId = get().activeWorkspaceId;
      const ids = Object.values(get().notes)
        .filter((note) => note.deletedAt && note.workspaceId === workspaceId)
        .map((note) => note.id);
      if (ids.length === 0) return;

      const ok = await requireVault("delete");
      if (!ok) return;

      set((state) => {
        const notes = { ...state.notes };
        const handles = { ...state.handles };
        for (const id of ids) {
          delete notes[id];
          delete handles[id];
        }
        return { notes, handles, openTabs: withoutTabs(state.openTabs, ids) };
      });
      void setMeta(TABS_KEY, get().openTabs);
      await removeNotes(ids);
      void syncAdapter().removeNotes(ids);
      toast.success(`Deleted ${ids.length} note${ids.length === 1 ? "" : "s"} for good`);
    },

    renameLabel(from, to) {
      const source = from.trim().toLowerCase();
      const nextName = to.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!source || !nextName) return 0;
      const workspaceId = get().activeWorkspaceId;

      const stamp = Date.now();
      let touched = 0;
      set((state) => {
        const notes = { ...state.notes };
        for (const [id, note] of Object.entries(notes)) {
          if (note.deletedAt || note.workspaceId !== workspaceId) continue;
          if (!note.tags.some((tag) => tag.toLowerCase() === source)) continue;
          const tags = note.tags
            .map((tag) => (tag.toLowerCase() === source ? nextName : tag))
            .filter((tag, index, all) => all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === index);
          notes[id] = { ...note, tags, updatedAt: stamp };
          dirtyNotes.add(id);
          touched += 1;
        }
        return { notes };
      });
      if (touched > 0) {
        scheduleIdb();
        void get()
          .flush({ toDisk: false })
          .then(() => syncAdapter().flushCloud?.());
      }
      return touched;
    },

    removeLabel(label) {
      const target = label.trim().toLowerCase();
      if (!target) return 0;
      const workspaceId = get().activeWorkspaceId;

      const stamp = Date.now();
      let touched = 0;
      set((state) => {
        const notes = { ...state.notes };
        for (const [id, note] of Object.entries(notes)) {
          if (note.deletedAt || note.workspaceId !== workspaceId) continue;
          if (!note.tags.some((tag) => tag.toLowerCase() === target)) continue;
          const tags = note.tags.filter((tag) => tag.toLowerCase() !== target);
          notes[id] = { ...note, tags, updatedAt: stamp };
          dirtyNotes.add(id);
          touched += 1;
        }
        return { notes };
      });
      if (touched > 0) {
        scheduleIdb();
        void get()
          .flush({ toDisk: false })
          .then(() => syncAdapter().flushCloud?.());
      }
      return touched;
    },

    async flush(options) {
      const toDisk = options?.toDisk ?? true;

      if (idbTimer) {
        clearTimeout(idbTimer);
        idbTimer = null;
      }

      const noteIds = [...dirtyNotes];
      dirtyNotes.clear();
      const workspaceIds = [...dirtyWorkspaces];
      dirtyWorkspaces.clear();

      if (workspaceIds.length > 0) {
        const { workspaces } = get();
        const workspacePayload = workspaceIds.map((id) => workspaces[id]).filter(Boolean);
        try {
          await saveWorkspaces(workspacePayload);
          if (get().cloudUserId && workspacePayload.length > 0) {
            void syncAdapter().pushWorkspaces?.(workspacePayload);
          }
        } catch (error) {
          for (const id of workspaceIds) dirtyWorkspaces.add(id);
          console.error("NoteSeen: failed to persist workspaces", error);
        }
      }

      if (noteIds.length > 0) {
        const { notes } = get();
        const payload = noteIds.map((id) => notes[id]).filter(Boolean);
        try {
          await saveNotes(payload);
          clearSnapshot();
          set({ status: "saved", lastSavedAt: Date.now() });
          if (get().cloudUserId && payload.length > 0) {
            void syncAdapter().pushNotes(payload);
          }
        } catch (error) {
          for (const id of noteIds) dirtyNotes.add(id);
          set({ status: "error" });
          console.error("NoteSeen: failed to persist notes", error);
          toast.error("Could not save locally", {
            description: "Browser storage rejected the write. Export this note to a file to be safe.",
          });
        }
      } else if (get().status === "saving") {
        set({ status: "saved", lastSavedAt: Date.now() });
      }

      if (toDisk) {
        if (fileTimer) {
          clearTimeout(fileTimer);
          fileTimer = null;
        }
        const fileIds = [...dirtyFiles];
        dirtyFiles.clear();
        if (fileIds.length > 0) await writeLinkedFiles(fileIds);
      }
    },

    async saveToFile(id, options) {
      const note = get().notes[id];
      if (!note) return;

      const existing = get().handles[id];
      if (existing && !options?.forcePicker) {
        try {
          const written = await writeNoteToHandle(existing, note);
          if (written) {
            set({ lastSavedAt: Date.now(), status: "saved" });
            toast.success(`Saved to ${existing.name}`);
            return;
          }
        } catch {
          // Fall through to the picker so the user can choose a new location.
        }
      }

      if (!supportsFileSystemAccess()) {
        downloadNote(note);
        toast.success("Downloaded as a .noteseen file", {
          description: "This browser cannot write files in place, so it went to your downloads.",
        });
        return;
      }

      try {
        const handle = await pickSaveTarget(note);
        if (!handle) return;
        await writeNoteToHandle(handle, note);
        set((state) => ({ handles: { ...state.handles, [id]: handle } }));
        await putFileHandle(id, handle);
        get().patchNote(id, { fileName: handle.name }, { touch: false });
        permissionWarned = false;
        toast.success(`Linked to ${handle.name}`, {
          description: "Edits from now on are written straight into this file.",
        });
      } catch (error) {
        if (isAbortError(error)) return;
        console.error("NoteSeen: save to file failed", error);
        toast.error("Could not save the file");
      }
    },

    async unlinkFile(id) {
      set((state) => {
        const handles = { ...state.handles };
        delete handles[id];
        return { handles };
      });
      dirtyFiles.delete(id);
      await deleteFileHandle(id);
      get().patchNote(id, { fileName: null }, { touch: false });
    },

    async importHandles(handles) {
      let lastId: string | null = null;
      for (const handle of handles) {
        try {
          const file = await handle.getFile();
          const imported = await readNoteFile(file);

          const match = Object.values(get().notes).find(
            (note) => note.fileName === imported.fileName && !note.deletedAt,
          );
          if (match) {
            get().patchNote(
              match.id,
              { title: imported.title, html: imported.html, text: imported.text },
              { touch: false },
            );
            set((state) => ({
              handles: { ...state.handles, [match.id]: handle },
              activeId: match.id,
              view: "editor",
            }));
            await putFileHandle(match.id, handle);
            lastId = match.id;
            continue;
          }

          lastId = insertImported(imported, handle);
        } catch (error) {
          console.error("NoteSeen: could not open file", error);
          toast.error(`Could not open ${handle.name}`);
        }
      }
      if (lastId) void setMeta(ACTIVE_KEY, lastId);
      return lastId;
    },

    async importFiles(files) {
      let lastId: string | null = null;
      for (const file of files) {
        try {
          lastId = insertImported(await readNoteFile(file));
        } catch (error) {
          console.error("NoteSeen: could not read file", error);
          toast.error(`Could not read ${file.name}`);
        }
      }
      if (lastId) void setMeta(ACTIVE_KEY, lastId);
      return lastId;
    },

    setCloudUser(uid) {
      set({ cloudUserId: uid });
    },

    mergeRemoteNotes(remoteNotes) {
      const local = get().notes;
      const next = { ...local };
      const toSave: Note[] = [];
      let changed = false;

      for (const remoteRaw of remoteNotes) {
        const remote = normalizeNote(remoteRaw);
        const existing = local[remote.id];
        if (!existing) {
          next[remote.id] = remote;
          toSave.push(remote);
          changed = true;
          continue;
        }

        const merged = mergeRemote(existing, remote);
        if (merged === existing) continue;
        const note = normalizeNote({ ...merged, fileName: existing.fileName });
        next[remote.id] = note;
        toSave.push(note);
        changed = true;
      }

      if (!changed) return;
      set({ notes: next });
      if (toSave.length > 0) void saveNotes(toSave);

      // Drop permanently deleted notes from the open editor.
      const activeId = get().activeId;
      if (activeId && next[activeId]?.deletedAt) {
        const live = Object.values(next)
          .filter((note) => !note.deletedAt)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        set({ activeId: live[0]?.id ?? null, view: live[0] ? "editor" : "all" });
      }
    },

    mergeRemoteWorkspaces(remoteWorkspaces) {
      const local = get().workspaces;
      const next = { ...local };
      const toSave: Workspace[] = [];
      let changed = false;

      for (const remoteRaw of remoteWorkspaces) {
        const remote = normalizeWorkspace(remoteRaw);
        const existing = local[remote.id];
        if (!existing) {
          next[remote.id] = remote;
          toSave.push(remote);
          changed = true;
          continue;
        }
        const merged = mergeRemoteWorkspace(existing, remote);
        if (merged === existing) continue;
        next[remote.id] = merged;
        toSave.push(merged);
        changed = true;
      }

      if (!next[DEFAULT_WORKSPACE_ID]) {
        next[DEFAULT_WORKSPACE_ID] = defaultWorkspace();
        toSave.push(next[DEFAULT_WORKSPACE_ID]);
        changed = true;
      }

      if (!changed) return;
      set({ workspaces: next });
      if (toSave.length > 0) void saveWorkspaces(toSave);

      const active = get().activeWorkspaceId;
      if (!next[active]) {
        set({ activeWorkspaceId: DEFAULT_WORKSPACE_ID });
        void setMeta(WORKSPACE_KEY, DEFAULT_WORKSPACE_ID);
      }
    },

    async pushAllToCloud() {
      if (!get().cloudUserId) return;
      const all = Object.values(get().notes);
      const allWorkspaces = Object.values(get().workspaces);
      if (all.length > 0) await syncAdapter().pushNotes(all);
      if (allWorkspaces.length > 0) await syncAdapter().pushWorkspaces?.(allWorkspaces);
      await syncAdapter().flushCloud?.();
    },
  };
});

/**
 * Flush on every exit path the browser gives us, so "close the tab" is a
 * legitimate way to save.
 */
export function registerLifecycleFlush(): () => void {
  const flush = () => void useNotes.getState().flush({ toDisk: true });

  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  window.addEventListener("blur", flush);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
    window.removeEventListener("beforeunload", flush);
    window.removeEventListener("blur", flush);
  };
}

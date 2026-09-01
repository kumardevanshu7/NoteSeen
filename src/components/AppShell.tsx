import { useCallback, useEffect, useState } from "react";
import { FilePlus2, FolderOpen, Minimize2, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isAbortError, consumeLaunchFiles, supportsFileSystemAccess, type NsFileHandle } from "@/lib/fs";
import { pickNoteFiles } from "@/lib/note-file";
import { isEditableTarget } from "@/lib/utils";
import { useFullscreen } from "@/store/fullscreen";
import { registerLifecycleFlush, useNotes } from "@/store/notes";
import { useVault } from "@/store/vault";
import { CommandPalette } from "./CommandPalette";
import { NoteEditor } from "./NoteEditor";
import { NotesGrid } from "./NotesGrid";
import { PromptCardsView } from "./PromptCardsView";
import { SuggestionsView } from "./SuggestionsView";
import { LabelsView } from "./LabelsView";
import { SecretVaultView } from "./SecretVaultView";
import { NewItemDialog } from "./NewItemDialog";
import { PromptEditor } from "./PromptEditor";
import { SaveIndicator } from "./SaveIndicator";
import { SharedView } from "./SharedView";
import { NoteTabs } from "./NoteTabs";
import { SideRail } from "./SideRail";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";
import { TrashView } from "./TrashView";
import { VaultGateDialog } from "./VaultGateDialog";
import { UnlockTimerDialog } from "./UnlockTimerDialog";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { ImageEditDialog } from "./ImageEditDialog";
import { hideBootSplash } from "@/lib/boot";
import type { NoteKind } from "@/lib/types";

const NOTE_FILE_PATTERN = /\.(noteseen|md|markdown|txt|html?)$/i;
const STYLE_PANEL_KEY = "noteseen.style-panel";

function readStyleOpen(): boolean {
  try {
    const stored = localStorage.getItem(STYLE_PANEL_KEY);
    if (stored === "hidden") return false;
    if (stored === "open") return true;
  } catch {
    // ignore
  }
  return window.matchMedia("(min-width: 1280px)").matches;
}

function isNoteFileName(name: string): boolean {
  return NOTE_FILE_PATTERN.test(name);
}

function isNoteFile(file: File): boolean {
  return isNoteFileName(file.name);
}

export function AppShell() {
  const ready = useNotes((state) => state.ready);
  const init = useNotes((state) => state.init);
  const notes = useNotes((state) => state.notes);
  const activeId = useNotes((state) => state.activeId);
  const view = useNotes((state) => state.view);
  const setView = useNotes((state) => state.setView);
  const createNote = useNotes((state) => state.createNote);
  const createItem = useNotes((state) => state.createItem);
  const saveToFile = useNotes((state) => state.saveToFile);
  const importHandles = useNotes((state) => state.importHandles);
  const importFiles = useNotes((state) => state.importFiles);
  const initVault = useVault((state) => state.initVault);

  const isFullscreen = useFullscreen((state) => state.isFullscreen);
  const toggleFullscreen = useFullscreen((state) => state.toggleFullscreen);
  const [navOpen, setNavOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(readStyleOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [unlockTimerOpen, setUnlockTimerOpen] = useState(false);

  const note = activeId ? (notes[activeId] ?? null) : null;

  useEffect(() => {
    if (note?.kind === "promptCard" && view === "editor") setView("cards");
  }, [note?.kind, view, setView]);

  useEffect(() => {
    void init();
    void initVault();
    return registerLifecycleFlush();
  }, [init, initVault]);

  useEffect(() => {
    if (ready) hideBootSplash();
  }, [ready]);

  useEffect(() => {
    try {
      localStorage.setItem(STYLE_PANEL_KEY, styleOpen ? "open" : "hidden");
    } catch {
      // ignore
    }
  }, [styleOpen]);

  // Edge swipe (from left) opens the sidebar on phones.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (event: TouchEvent) => {
      if (navOpen) return;
      const touch = event.touches[0];
      if (!touch) return;
      if (touch.clientX > 28) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 56 && dy < 48) {
        tracking = false;
        setNavOpen(true);
      }
    };

    const onEnd = () => {
      tracking = false;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [navOpen]);

  const openFromDisk = useCallback(async () => {
    if (!supportsFileSystemAccess()) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".noteseen,.md,.markdown,.txt";
      input.multiple = true;
      input.addEventListener("change", () => {
        void importFiles(Array.from(input.files ?? []));
      });
      input.click();
      return;
    }

    try {
      const handles = await pickNoteFiles();
      if (handles.length > 0) await importHandles(handles);
    } catch (error) {
      if (!isAbortError(error)) {
        console.error("NoteSeen: open failed", error);
        toast.error("Could not open that file");
      }
    }
  }, [importFiles, importHandles]);

  // Opening a .noteseen file from the OS lands here once the PWA is installed.
  useEffect(() => {
    consumeLaunchFiles((handles: NsFileHandle[]) => {
      void importHandles(handles);
    });
  }, [importHandles]);

  useEffect(() => {
    if (!window.location.search) return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("new") === "1") setChooserOpen(true);
    if (params.get("search") === "1") setPaletteOpen(true);

    const shared = params.get("text") ?? params.get("url");
    if (shared) {
      createNote({
        title: params.get("title") ?? "",
        html: `<p>${shared.replace(/[<>&]/g, "")}</p>`,
      });
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [createNote]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "F11" || (mod && event.shiftKey && event.key.toLowerCase() === "f")) {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.key === "Escape" && isFullscreen) {
        event.preventDefault();
        useFullscreen.getState().setFullscreen(false);
        return;
      }

      if (!mod) return;
      const key = event.key.toLowerCase();

      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (key === "n" && !event.shiftKey) {
        event.preventDefault();
        setChooserOpen(true);
        return;
      }
      if (key === "s") {
        event.preventDefault();
        if (activeId) void saveToFile(activeId);
        return;
      }
      if (key === "o") {
        event.preventDefault();
        void openFromDisk();
        return;
      }
      if (key === "f" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, isFullscreen, openFromDisk, saveToFile, toggleFullscreen]);

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    };

    const onDrop = async (event: DragEvent) => {
      const items = Array.from(event.dataTransfer?.items ?? []);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (items.length === 0 && files.length === 0) return;
      event.preventDefault();

      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length > 0 && files.every((file) => file.type.startsWith("image/"))) {
        return;
      }

      const noteFiles = files.filter(isNoteFile);
      const handleGetters = items
        .filter((item) => item.kind === "file")
        .map((item) => {
          const withHandle = item as DataTransferItem & {
            getAsFileSystemHandle?: () => Promise<NsFileHandle | null>;
          };
          return withHandle.getAsFileSystemHandle?.();
        })
        .filter((value): value is Promise<NsFileHandle | null> => value !== undefined);

      if (handleGetters.length > 0) {
        const handles = (await Promise.all(handleGetters)).filter(
          (handle): handle is NsFileHandle => handle !== null && isNoteFileName(handle.name),
        );
        if (handles.length > 0) {
          await importHandles(handles);
          return;
        }
      }

      if (noteFiles.length > 0) {
        await importFiles(noteFiles);
      } else if (files.length > 0) {
        toast("That file type is not supported", {
          description: "Drop a .noteseen, .md or .txt file, or an image to place it in the note.",
        });
      }
    };

    const onDropEvent = (event: DragEvent) => void onDrop(event);

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDropEvent);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDropEvent);
    };
  }, [importFiles, importHandles]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="ns-mono text-muted">Opening NoteSeen…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      {!isFullscreen ? (
        <TopBar
          note={note}
          onOpenNav={() => setNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenFiles={() => void openFromDisk()}
          onOpenUnlockTimer={() => setUnlockTimerOpen(true)}
        />
      ) : (
        <div className="ns-no-print fixed top-3 right-4 z-50 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1.5 rounded-full border-hairline bg-surface/90 backdrop-blur-md px-3 py-1 text-xs text-ink shadow-lg hover:bg-surface"
          >
            <Minimize2 className="size-3.5" />
            <span>Exit full screen</span>
            <span className="font-mono text-[10px] text-muted">Esc</span>
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isFullscreen ? (
          <div className="ns-no-print hidden h-full min-h-0 lg:block">
            <SideRail />
          </div>
        ) : null}

        {navOpen && !isFullscreen ? (
          <div className="ns-no-print fixed inset-0 z-40 flex lg:hidden">
            <div
              className="ns-fade absolute inset-0 bg-black/25"
              onClick={() => setNavOpen(false)}
              aria-hidden
            />
            <div className="relative z-10 h-full">
              <SideRail onClose={() => setNavOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!isFullscreen ? <NoteTabs /> : null}
          {view === "suggestions" ? <SuggestionsView /> : null}
          {view === "all" ? <NotesGrid /> : null}
          {view === "cards" ? <PromptCardsView /> : null}
          {view === "labels" ? <LabelsView /> : null}
          {view === "secrets" ? <SecretVaultView /> : null}
          {view === "trash" ? <TrashView /> : null}
          {view === "shared" ? <SharedView /> : null}
          {view === "editor" ? (
            note ? (
              <>
                <div
                  className={`ns-scroll min-h-0 flex-1 overflow-y-auto transition-all ${
                    isFullscreen
                      ? "p-0 bg-canvas"
                      : "px-3 py-4 sm:px-6 sm:py-6 md:px-8"
                  }`}
                >
                  <article
                    className={`ns-paper mx-auto w-full transition-all duration-200 ${
                      isFullscreen
                        ? "max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-6 py-10 sm:px-16 sm:py-14 md:px-24 md:py-16 rounded-none border-none shadow-none"
                        : "max-w-4xl lg:max-w-5xl xl:max-w-[64rem] 2xl:max-w-[72rem] px-5 py-7 sm:px-12 sm:py-10 md:px-16 md:py-12"
                    }`}
                    data-fullscreen={isFullscreen ? "true" : undefined}
                    data-theme={note.theme}
                    data-typeface={note.typeface}
                    data-size={note.size}
                    data-spacing={note.spacing}
                  >
                    <EditorErrorBoundary key={note.id}>
                      {note.kind === "prompt" ? (
                        <PromptEditor note={note} />
                      ) : (
                        <NoteEditor note={note} />
                      )}
                    </EditorErrorBoundary>
                  </article>
                </div>
                {!isFullscreen ? (
                  <footer className="ns-no-print flex h-10 shrink-0 items-center justify-between border-t border-hairline px-5">
                    <SaveIndicator fileName={note.fileName} />
                    <span className="ns-mono text-muted">
                      {note.kind === "prompt" ? "prompt" : ".noteseen"}
                    </span>
                  </footer>
                ) : null}
              </>
            ) : (
              <EmptyEditor onCreate={() => setChooserOpen(true)} onOpen={() => void openFromDisk()} />
            )
          ) : null}
        </main>

        {!isFullscreen && view === "editor" && note && note.kind === "note" ? (
          <>
            {styleOpen ? (
              <div className="ns-no-print hidden h-full min-h-0 xl:block">
                <ToolRail
                  note={note}
                  onClose={() => setStyleOpen(false)}
                  className="h-full"
                />
              </div>
            ) : null}

            {!styleOpen ? (
              <button
                type="button"
                onClick={() => setStyleOpen(true)}
                className="ns-no-print fixed right-4 bottom-16 z-30 flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2.5 text-[13px] font-medium text-ink shadow-lg"
              >
                <Palette className="size-4" />
                Style
              </button>
            ) : null}

            {styleOpen ? (
              <div className="ns-no-print fixed inset-0 z-40 flex justify-end xl:hidden">
                <div
                  className="ns-fade absolute inset-0 bg-black/40"
                  onClick={() => setStyleOpen(false)}
                  aria-hidden
                />
                <div className="relative z-10 h-full max-w-[85vw]">
                  <ToolRail
                    note={note}
                    onClose={() => setStyleOpen(false)}
                    className="h-full shadow-2xl"
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenFiles={() => void openFromDisk()}
        onCreate={() => setChooserOpen(true)}
        onOpenUnlockTimer={() => setUnlockTimerOpen(true)}
      />
      <NewItemDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onChoose={(kind: NoteKind) => createItem(kind)}
      />
      <VaultGateDialog />
      <UnlockTimerDialog
        open={unlockTimerOpen}
        onOpenChange={setUnlockTimerOpen}
      />
      <ImageEditDialog />
    </div>
  );
}

function EmptyEditor({ onCreate, onOpen }: { onCreate: () => void; onOpen: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="ns-display text-ink">Nothing open</h1>
      <p className="ns-caption mt-3 max-w-sm text-body-muted">
        Start a note or prompt, or open a <span className="font-mono text-[13px]">.noteseen</span>{" "}
        file you saved earlier.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={onCreate}>
          <FilePlus2 className="size-4" />
          New
        </Button>
        <Button variant="outline" onClick={onOpen}>
          <FolderOpen className="size-4" />
          Open a file
        </Button>
      </div>
    </div>
  );
}

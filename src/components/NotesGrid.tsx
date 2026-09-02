import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  CheckSquare,
  Columns3,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyButton } from "@/components/CopyButton";
import { MoveToWorkspaceMenu } from "@/components/MoveToWorkspaceMenu";
import { NewItemDialog } from "@/components/NewItemDialog";
import { ArchivePromptDialog } from "@/components/ArchivePromptDialog";
import { BundleManageDialog } from "@/components/BundleManageDialog";
import { BundlePicker } from "@/components/BundlePicker";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import {
  collectBundles,
  liveNotes,
  noteLabel,
  notesForBundle,
  notesForWorkspace,
  searchNotes,
} from "@/lib/selectors";
import type { BundleInfo, Note, NoteKind } from "@/lib/types";
import { cn, excerpt, formatRelative } from "@/lib/utils";

type KindFilter = "all" | "note" | "prompt" | "bundle";
type ViewMode = "grid" | "list";

const COLUMN_CHOICES = [2, 3, 4, 5, 6, 7] as const;
const PREFS_KEY = "noteseen.grid-prefs";

interface GridPrefs {
  kind: KindFilter;
  view: ViewMode;
  cols: number;
}

function readPrefs(): GridPrefs {
  const fallback: GridPrefs = { kind: "all", view: "grid", cols: 3 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GridPrefs>;
    return {
      kind:
        parsed.kind === "note" || parsed.kind === "prompt" || parsed.kind === "bundle"
          ? parsed.kind
          : "all",
      view: parsed.view === "list" ? "list" : "grid",
      cols: COLUMN_CHOICES.includes(parsed.cols as (typeof COLUMN_CHOICES)[number])
        ? (parsed.cols as number)
        : 3,
    };
  } catch {
    return fallback;
  }
}

/** Screens cannot honour 7 columns on a phone, so the choice is a ceiling. */
function columnCeiling(width: number): number {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1280) return 3;
  if (width < 1536) return 4;
  return COLUMN_CHOICES[COLUMN_CHOICES.length - 1];
}

function useColumnCeiling(): number {
  const [ceiling, setCeiling] = useState(() =>
    typeof window === "undefined" ? 3 : columnCeiling(window.innerWidth),
  );

  useEffect(() => {
    const handle = () => setCeiling(columnCeiling(window.innerWidth));
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  return ceiling;
}

export function NotesGrid() {
  const notes = useNotes((state) => state.notes);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const query = useNotes((state) => state.query);
  const setActive = useNotes((state) => state.setActive);
  const createItem = useNotes((state) => state.createItem);
  const togglePin = useNotes((state) => state.togglePin);
  const trashNotes = useNotes((state) => state.trashNotes);
  const archiveNotes = useNotes((state) => state.archiveNotes);
  const toggleComplete = useNotes((state) => state.toggleComplete);
  const setNoteBundle = useNotes((state) => state.setNoteBundle);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [archivePromptNote, setArchivePromptNote] = useState<Note | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [bundleManageState, setBundleManageState] = useState<{
    open: boolean;
    mode: "create" | "rename" | "delete";
    bundleName?: string;
  }>({ open: false, mode: "create" });
  const [prefs, setPrefs] = useState<GridPrefs>(readPrefs);

  const ceiling = useColumnCeiling();
  const effectiveCols = prefs.view === "list" ? 1 : Math.min(prefs.cols, ceiling);
  const compact = effectiveCols >= 4;

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Private mode — preferences just do not persist.
    }
  }, [prefs]);

  const scopedNotes = useMemo(
    () => notesForWorkspace(notes, activeWorkspaceId),
    [notes, activeWorkspaceId],
  );

  const allLive = useMemo(
    () => liveNotes(scopedNotes).filter((note) => note.kind !== "promptCard"),
    [scopedNotes],
  );

  const allBundles = useMemo(() => collectBundles(scopedNotes), [scopedNotes]);

  const counts = useMemo(
    () => ({
      all: allLive.length,
      note: allLive.filter((note) => note.kind !== "prompt").length,
      prompt: allLive.filter((note) => note.kind === "prompt").length,
      bundle: allBundles.length,
    }),
    [allLive, allBundles],
  );

  const allLabels = useMemo(() => {
    const set = new Map<string, string>();
    for (const note of allLive) {
      for (const tag of note.tags) {
        const key = tag.toLowerCase();
        if (!set.has(key)) set.set(key, tag);
      }
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [allLive]);

  const isBundlesTab = prefs.kind === "bundle";
  const isViewingSpecificBundle = isBundlesTab && selectedBundle !== null;

  const visible = useMemo(() => {
    let list = allLive;
    if (isViewingSpecificBundle && selectedBundle) {
      list = notesForBundle(scopedNotes, selectedBundle);
    } else if (prefs.kind === "note") {
      list = list.filter((note) => note.kind !== "prompt");
    } else if (prefs.kind === "prompt") {
      list = list.filter((note) => note.kind === "prompt");
    }

    list = searchNotes(list, query);

    if (labelFilter) {
      const needle = labelFilter.toLowerCase();
      list = list.filter((note) => note.tags.some((tag) => tag.toLowerCase() === needle));
    }
    return list;
  }, [allLive, scopedNotes, query, labelFilter, prefs.kind, isViewingSpecificBundle, selectedBundle]);

  const visibleBundles = useMemo(() => {
    if (!query.trim()) return allBundles;
    const needle = query.trim().toLowerCase();
    return allBundles.filter((b) => b.name.toLowerCase().includes(needle));
  }, [allBundles, query]);

  const selectedIds = useMemo(
    () => visible.map((note) => note.id).filter((id) => selected[id]),
    [visible, selected],
  );
  const allSelected = visible.length > 0 && selectedIds.length === visible.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const note of visible) next[note.id] = true;
    setSelected(next);
  };

  const onChoose = (kind: NoteKind) => {
    createItem(kind, { bundle: selectedBundle ?? undefined });
  };

  const handleToggleComplete = (note: Note) => {
    const next = toggleComplete(note.id);
    if (next) {
      setArchivePromptNote(note);
    } else {
      toast.info("Marked note as incomplete");
    }
  };

  const handleArchiveSingle = (note: Note) => {
    archiveNotes([note.id]);
    toast.success("Moved to Archive Space", {
      description: `"${noteLabel(note)}" was archived.`,
    });
  };

  const handleSelectBundleDirectly = (name: string | null) => {
    setSelectedBundle(name);
    setPrefs((prev) => ({ ...prev, kind: "bundle" }));
  };

  const heading = isViewingSpecificBundle
    ? selectedBundle
    : prefs.kind === "bundle"
      ? "Note Bundles"
      : prefs.kind === "note"
        ? "My Notes"
        : prefs.kind === "prompt"
          ? "My Prompts"
          : "Everything";

  return (
    <div className="ns-scroll min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-10 sm:py-8">
      <div className={cn("mx-auto w-full min-w-0", effectiveCols >= 4 ? "max-w-[110rem]" : "max-w-5xl")}>
        {/* Top Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {isViewingSpecificBundle ? (
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedBundle(null)}
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>All Bundles</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Folder className="size-4" />
                  </div>
                  <h1 className="ns-display truncate text-ink">{selectedBundle}</h1>
                </div>
                <p className="ns-caption mt-1.5 text-xs sm:text-sm text-body-muted">
                  {visible.length} {visible.length === 1 ? "note" : "notes"} in this bundle
                  {query ? ` matching “${query}”` : ""}
                </p>
              </div>
            ) : (
              <div>
                <h1 className="ns-display text-ink">{heading}</h1>
                <p className="ns-caption mt-2 text-body-muted">
                  {isBundlesTab ? (
                    <>
                      {allBundles.length} {allBundles.length === 1 ? "bundle" : "bundles"}
                      {query ? ` matching “${query}”` : " • Group similar subject notes together"}
                    </>
                  ) : (
                    <>
                      {visible.length} {visible.length === 1 ? "item" : "items"}
                      {labelFilter ? ` labeled “${labelFilter}”` : ""}
                      {query ? ` matching “${query}”` : labelFilter ? "" : " on this device"}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isViewingSpecificBundle ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 px-2.5">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setBundleManageState({
                          open: true,
                          mode: "rename",
                          bundleName: selectedBundle!,
                        })
                      }
                    >
                      <Pencil className="mr-2 size-3.5" />
                      Rename Bundle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-error"
                      onClick={() =>
                        setBundleManageState({
                          open: true,
                          mode: "delete",
                          bundleName: selectedBundle!,
                        })
                      }
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Disband Bundle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5 pl-3"
                  onClick={() => createItem("note", { bundle: selectedBundle! })}
                >
                  <Plus className="size-3.5" />
                  New Note in Bundle
                </Button>
              </>
            ) : isBundlesTab ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 pl-3"
                onClick={() => setBundleManageState({ open: true, mode: "create" })}
              >
                <FolderPlus className="size-3.5" />
                New Bundle
              </Button>
            ) : (
              <>
                {visible.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {allSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                    {allSelected ? "Clear" : "Select all"}
                  </Button>
                ) : null}
                {selectedIds.length > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-accent"
                      onClick={() => {
                        const count = archiveNotes(selectedIds);
                        if (count > 0) {
                          setSelected({});
                          toast.success(`Moved ${count} notes to Archive Space`);
                        }
                      }}
                    >
                      <Archive className="size-3.5" />
                      Archive ({selectedIds.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-error"
                      onClick={() => {
                        void trashNotes(selectedIds).then((ok) => {
                          if (ok) setSelected({});
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete ({selectedIds.length})
                    </Button>
                  </>
                ) : null}
                <Button variant="primary" size="sm" className="gap-1.5 pl-3" onClick={() => setChooserOpen(true)}>
                  <Plus className="size-3.5" />
                  New
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Category Tabs & View Options */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-hairline p-1 max-w-full overflow-x-auto">
            {(
              [
                { id: "all", label: "All", icon: LayoutGrid },
                { id: "note", label: "Notes", icon: FileText },
                { id: "prompt", label: "Prompts", icon: Sparkles },
                { id: "bundle", label: "Bundles", icon: Folder },
              ] as { id: KindFilter; label: string; icon: typeof FileText }[]
            ).map((tab) => {
              const active = prefs.kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setPrefs((prev) => ({ ...prev, kind: tab.id }));
                    if (tab.id !== "bundle") setSelectedBundle(null);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors cursor-pointer",
                    active
                      ? "bg-primary font-medium text-primary-ink"
                      : "text-slate hover:bg-stone hover:text-ink",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  <span>{tab.label}</span>
                  <span className={cn("ns-mono text-[11px]", active ? "text-primary-ink/70" : "text-muted")}>
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {!isBundlesTab || isViewingSpecificBundle ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
                {(
                  [
                    { id: "grid", label: "Grid view", icon: LayoutGrid },
                    { id: "list", label: "List view", icon: List },
                  ] as { id: ViewMode; label: string; icon: typeof List }[]
                ).map((option) => {
                  const active = prefs.view === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={active}
                      onClick={() => setPrefs((prev) => ({ ...prev, view: option.id }))}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer",
                        active ? "bg-primary text-primary-ink" : "text-slate hover:bg-stone hover:text-ink",
                      )}
                    >
                      <option.icon className="size-4" />
                    </button>
                  );
                })}
              </div>

              {prefs.view === "grid" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="size-3.5" />
                      {prefs.cols} cols
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Columns</DropdownMenuLabel>
                    {COLUMN_CHOICES.map((count) => (
                      <DropdownMenuItem
                        key={count}
                        onSelect={() => setPrefs((prev) => ({ ...prev, cols: count }))}
                      >
                        <span className="flex-1">{count} columns</span>
                        {prefs.cols === count ? <Check className="size-3.5" /> : null}
                      </DropdownMenuItem>
                    ))}
                    {ceiling < prefs.cols ? (
                      <p className="ns-micro px-2.5 pt-2 pb-1 text-muted">
                        Showing {ceiling} — screen is too narrow for {prefs.cols}.
                      </p>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Labels Filter Bar */}
        {(!isBundlesTab || isViewingSpecificBundle) && allLabels.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="ns-mono text-xs text-muted">Labels</span>
            <button
              type="button"
              onClick={() => setLabelFilter(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] transition-colors cursor-pointer",
                labelFilter === null
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-hairline bg-surface text-slate hover:bg-stone",
              )}
            >
              All
            </button>
            {allLabels.map((label) => {
              const active = labelFilter?.toLowerCase() === label.toLowerCase();
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setLabelFilter(active ? null : label)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors cursor-pointer",
                    active
                      ? "border-primary bg-primary text-primary-ink"
                      : "border-hairline bg-surface text-slate hover:bg-stone",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Main Content Area */}
        {isBundlesTab && !selectedBundle ? (
          /* Bundles Overview Grid */
          <div className="mt-6 w-full min-w-0">
            {visibleBundles.length === 0 ? (
              <div className="mt-12 flex flex-col items-center text-center px-4">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-hairline bg-stone/60 text-muted shadow-xs">
                  <Folder className="size-7" />
                </div>
                <p className="mt-4 text-base sm:text-lg font-semibold text-ink">
                  {query ? "No bundles match your search." : "No note bundles created yet."}
                </p>
                <p className="ns-caption mt-1.5 max-w-sm text-xs sm:text-sm text-body-muted leading-relaxed">
                  {query
                    ? "Try a different search term or create a new bundle."
                    : "Create bundles to organize your notes by subject, topic, or project (e.g. Physics, Chemistry, Math, Client Work)."}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-6 h-9 sm:h-10 rounded-full px-5 text-xs sm:text-sm font-medium shadow-xs gap-1.5"
                  onClick={() => setBundleManageState({ open: true, mode: "create" })}
                >
                  <FolderPlus className="size-4" />
                  <span>Create First Bundle</span>
                </Button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full min-w-0">
                {visibleBundles.map((b) => (
                  <BundleFolderCard
                    key={b.name}
                    bundle={b}
                    onOpen={() => setSelectedBundle(b.name)}
                    onRename={() =>
                      setBundleManageState({ open: true, mode: "rename", bundleName: b.name })
                    }
                    onDelete={() =>
                      setBundleManageState({ open: true, mode: "delete", bundleName: b.name })
                    }
                  />
                ))}

                {/* Dashed Create Card */}
                <li className="min-w-0 w-full">
                  <button
                    type="button"
                    onClick={() => setBundleManageState({ open: true, mode: "create" })}
                    className="group flex min-h-[10.5rem] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline/80 bg-stone/20 p-5 text-center transition-all hover:border-primary/50 hover:bg-stone/50 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border border-hairline bg-surface text-muted group-hover:text-primary transition-colors">
                      <FolderPlus className="size-5" />
                    </div>
                    <span className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                      + New Bundle
                    </span>
                    <span className="ns-caption text-[11px] text-muted">
                      Add a new subject collection
                    </span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : visible.length === 0 ? (
          /* Empty Notes View */
          <div className="mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center">
            <FileText className="mx-auto size-5 text-muted" />
            <p className="ns-feature mt-4 text-ink">
              {query || labelFilter || prefs.kind !== "all"
                ? "Nothing matches that filter"
                : "Nothing here yet"}
            </p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              {isViewingSpecificBundle
                ? `No notes in the "${selectedBundle}" bundle yet. Click "New Note in Bundle" to add one!`
                : "Create a note or a prompt. Add labels or bundles to organize them."}
            </p>
            {isViewingSpecificBundle && (
              <Button
                variant="primary"
                size="sm"
                className="mt-5 gap-1.5"
                onClick={() => createItem("note", { bundle: selectedBundle! })}
              >
                <Plus className="size-3.5" />
                New Note in this Bundle
              </Button>
            )}
          </div>
        ) : prefs.view === "grid" ? (
          /* Notes Grid View */
          <ul
            className={cn(
              "mt-6 grid gap-4 w-full min-w-0",
              effectiveCols === 1 && "grid-cols-1",
              effectiveCols === 2 && "grid-cols-1 sm:grid-cols-2",
              effectiveCols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              effectiveCols === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              effectiveCols === 5 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
              effectiveCols === 6 &&
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
              effectiveCols === 7 &&
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7",
            )}
          >
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                compact={compact}
                selected={Boolean(selected[note.id])}
                onToggleSelect={() => toggleOne(note.id)}
                onOpen={() => setActive(note.id)}
                onTogglePin={() => togglePin(note.id)}
                onToggleComplete={() => handleToggleComplete(note)}
                onArchive={() => handleArchiveSingle(note)}
                onTrash={() => void trashNotes([note.id])}
                onSelectBundle={handleSelectBundleDirectly}
                onSetBundle={(b) => setNoteBundle(note.id, b)}
              />
            ))}
          </ul>
        ) : (
          /* Notes List View */
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline w-full min-w-0">
            {visible.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                selected={Boolean(selected[note.id])}
                onToggleSelect={() => toggleOne(note.id)}
                onOpen={() => setActive(note.id)}
                onTogglePin={() => togglePin(note.id)}
                onToggleComplete={() => handleToggleComplete(note)}
                onArchive={() => handleArchiveSingle(note)}
                onTrash={() => void trashNotes([note.id])}
                onSelectBundle={handleSelectBundleDirectly}
                onSetBundle={(b) => setNoteBundle(note.id, b)}
              />
            ))}
          </ul>
        )}
      </div>

      <NewItemDialog open={chooserOpen} onOpenChange={setChooserOpen} onChoose={onChoose} />

      <ArchivePromptDialog
        open={Boolean(archivePromptNote)}
        onOpenChange={(open) => {
          if (!open) setArchivePromptNote(null);
        }}
        noteTitle={archivePromptNote ? noteLabel(archivePromptNote) : ""}
        onArchive={() => {
          if (archivePromptNote) {
            archiveNotes([archivePromptNote.id]);
            toast.success("Moved to Archive Space");
          }
        }}
        onKeep={() => {
          toast.success("Marked as 100% covered");
        }}
      />

      <BundleManageDialog
        open={bundleManageState.open}
        onOpenChange={(open) => setBundleManageState((prev) => ({ ...prev, open }))}
        mode={bundleManageState.mode}
        bundleName={bundleManageState.bundleName}
        onSuccess={(newName) => {
          if (bundleManageState.mode === "create" && newName) {
            setSelectedBundle(newName);
            setPrefs((prev) => ({ ...prev, kind: "bundle" }));
          } else if (bundleManageState.mode === "rename" && newName) {
            if (selectedBundle === bundleManageState.bundleName) {
              setSelectedBundle(newName);
            }
          } else if (bundleManageState.mode === "delete") {
            if (selectedBundle === bundleManageState.bundleName) {
              setSelectedBundle(null);
            }
          }
        }}
      />
    </div>
  );
}

/* =========================================================================
   Bundle Folder Card
   ========================================================================= */
interface BundleFolderCardProps {
  bundle: BundleInfo;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function BundleFolderCard({ bundle, onOpen, onRename, onDelete }: BundleFolderCardProps) {
  return (
    <li className="min-w-0 w-full">
      <div className="group flex min-h-[10.5rem] w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-hairline/80 bg-stone/30 p-4 transition-all hover:-translate-y-0.5 hover:border-hairline hover:bg-stone/60 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform cursor-pointer"
          >
            <Folder className="size-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Bundle options"
                className="flex size-7 items-center justify-center rounded-xs text-muted hover:bg-surface hover:text-ink transition-colors cursor-pointer"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="mr-2 size-3.5" />
                Open Bundle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 size-3.5" />
                Rename Bundle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-error" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" />
                Disband Bundle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="my-2 min-w-0 w-full text-left focus:outline-none cursor-pointer"
        >
          <span className="block break-words [overflow-wrap:anywhere] line-clamp-2 text-[16px] font-semibold text-ink group-hover:text-primary transition-colors leading-snug">
            {bundle.name}
          </span>
          <span className="ns-caption mt-1 block text-xs text-body-muted">
            {bundle.latestNote
              ? excerpt(bundle.latestNote.text, 60) || "Empty notes"
              : "No notes yet"}
          </span>
        </button>

        <div className="flex items-center justify-between border-t border-hairline/40 pt-2.5">
          <span className="ns-mono text-[11px] font-medium text-muted">
            {bundle.count} {bundle.count === 1 ? "note" : "notes"}
          </span>
          <span className="ns-mono text-[10.5px] text-muted">
            {formatRelative(bundle.updatedAt)}
          </span>
        </div>
      </div>
    </li>
  );
}

/* =========================================================================
   Note Card (Grid View)
   ========================================================================= */
interface ItemProps {
  note: Note;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleComplete: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onSelectBundle?: (bundle: string) => void;
  onSetBundle?: (bundle: string | null) => void;
}

function NoteCard({
  note,
  compact,
  selected,
  onToggleSelect,
  onOpen,
  onTogglePin,
  onToggleComplete,
  onArchive,
  onTrash,
  onSelectBundle,
  onSetBundle,
}: ItemProps & { compact: boolean }) {
  const theme = NOTE_THEMES.find((option) => option.id === note.theme) ?? NOTE_THEMES[0];

  return (
    <li className="min-w-0 w-full">
      <div
        className={cn(
          "group flex flex-col overflow-hidden rounded-sm border transition-transform hover:-translate-y-0.5 min-w-0 w-full",
          compact ? "h-44 p-3" : "h-56 p-4",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-canvas",
        )}
        style={{ background: theme.wash, borderColor: theme.line }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={selected ? "Deselect" : "Select"}
              onClick={onToggleSelect}
              className="flex size-7 items-center justify-center rounded-xs text-slate hover:bg-surface/70 cursor-pointer"
            >
              {selected ? <CheckSquare className="size-4 text-ink" /> : <Square className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleComplete}
              title={note.completed ? "100% Covered (click to uncheck)" : "Mark 100% Covered"}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer",
                note.completed
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                  : "text-muted hover:bg-stone/80 hover:text-emerald-500",
              )}
            >
              <CheckCircle2 className={cn("size-3.5", note.completed ? "text-emerald-500" : "text-muted")} />
              <span>100%</span>
            </button>
          </div>
          <span className="ns-mono flex items-center gap-1 text-muted">
            {note.kind === "prompt" ? <Sparkles className="size-3" /> : <FileText className="size-3" />}
            {compact ? null : note.kind}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="min-h-0 w-full flex-1 overflow-hidden text-left cursor-pointer"
        >
          <span
            className={cn(
              "line-clamp-2 block break-words [overflow-wrap:anywhere] font-medium text-ink",
              compact ? "text-[13.5px]" : "text-[15px]",
            )}
          >
            {noteLabel(note)}
          </span>
          <span
            className={cn(
              "ns-caption mt-2 block break-words [overflow-wrap:anywhere] text-body-muted",
              compact ? "line-clamp-2" : note.tags.length > 0 || note.bundle ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {excerpt(note.text, compact ? 80 : 140) ||
              (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
          </span>
        </button>

        <div className="mt-auto shrink-0 space-y-2 pt-2">
          {/* Bundle and Tags Pills */}
          {!compact && (note.bundle || note.tags.length > 0) ? (
            <div className="flex flex-wrap gap-1 items-center">
              {note.bundle ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBundle?.(note.bundle!);
                  }}
                  className="inline-flex items-center gap-1 max-w-[120px] truncate rounded-full border border-primary/25 bg-primary/10 px-2 py-px text-[10.5px] font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  title={`Bundle: ${note.bundle}`}
                >
                  <Folder className="size-2.5 shrink-0" />
                  <span className="truncate">{note.bundle}</span>
                </button>
              ) : null}

              {note.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="max-w-[100px] truncate rounded-full border border-hairline bg-surface/70 px-2 py-px text-[10.5px] text-slate"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <span className="ns-mono shrink-0 text-muted">{formatRelative(note.updatedAt)}</span>
            <div className="flex items-center gap-0.5">
              {onSetBundle && (
                <BundlePicker
                  currentBundle={note.bundle}
                  onSelect={onSetBundle}
                  size="sm"
                />
              )}
              <button
                type="button"
                aria-label="Archive"
                title="Move to Archive Space"
                onClick={onArchive}
                className="flex size-7 items-center justify-center rounded-full text-muted hover:text-accent cursor-pointer"
              >
                <Archive className="size-3.5" />
              </button>
              <CopyButton note={note} size="icon-sm" />
              <MoveToWorkspaceMenu noteId={note.id} currentWorkspaceId={note.workspaceId} />
              <button
                type="button"
                aria-label={note.pinned ? "Unpin" : "Pin"}
                onClick={onTogglePin}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full cursor-pointer",
                  note.pinned ? "text-coral" : "text-muted",
                )}
              >
                <Pin className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={onTrash}
                className="flex size-7 items-center justify-center rounded-full text-muted hover:text-error cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/* =========================================================================
   Note Row (List View)
   ========================================================================= */
function NoteRow({
  note,
  selected,
  onToggleSelect,
  onOpen,
  onTogglePin,
  onToggleComplete,
  onArchive,
  onTrash,
  onSelectBundle,
  onSetBundle,
}: ItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-2 py-3 transition-colors hover:bg-stone/50 min-w-0 w-full",
        selected && "bg-stone/60",
      )}
    >
      <button
        type="button"
        aria-label={selected ? "Deselect" : "Select"}
        onClick={onToggleSelect}
        className="flex size-7 shrink-0 items-center justify-center rounded-xs text-slate hover:bg-surface/70 cursor-pointer"
      >
        {selected ? <CheckSquare className="size-4 text-ink" /> : <Square className="size-4" />}
      </button>

      <button
        type="button"
        onClick={onToggleComplete}
        title={note.completed ? "100% Covered (click to uncheck)" : "Mark 100% Covered"}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
          note.completed
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
            : "text-muted hover:bg-stone/80 hover:text-emerald-500",
        )}
      >
        <CheckCircle2 className={cn("size-4", note.completed ? "text-emerald-500" : "text-muted")} />
      </button>

      {note.kind === "prompt" ? (
        <Sparkles className="size-3.5 shrink-0 text-slate" />
      ) : (
        <FileText className="size-3.5 shrink-0 text-slate" />
      )}

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="truncate text-[14px] font-medium text-ink">{noteLabel(note)}</span>
          {note.bundle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectBundle?.(note.bundle!);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-px text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
              title={`Bundle: ${note.bundle}`}
            >
              <Folder className="size-2.5 shrink-0" />
              <span>{note.bundle}</span>
            </button>
          ) : null}
        </div>
        <span className="ns-caption truncate text-body-muted">
          {excerpt(note.text, 160) || (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
        </span>
      </button>

      {note.tags.length > 0 ? (
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="max-w-[8rem] truncate rounded-full border border-hairline bg-surface px-2 py-px text-[11px] text-slate"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <span className="ns-mono hidden w-24 shrink-0 text-right text-muted sm:block">
        {formatRelative(note.updatedAt)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        {onSetBundle && (
          <BundlePicker
            currentBundle={note.bundle}
            onSelect={onSetBundle}
            size="sm"
          />
        )}
        <button
          type="button"
          aria-label="Archive"
          title="Move to Archive Space"
          onClick={onArchive}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:text-accent cursor-pointer"
        >
          <Archive className="size-3.5" />
        </button>
        <CopyButton note={note} size="icon-sm" />
        <button
          type="button"
          aria-label={note.pinned ? "Unpin" : "Pin"}
          onClick={onTogglePin}
          className={cn(
            "flex size-7 items-center justify-center rounded-full cursor-pointer",
            note.pinned ? "text-coral" : "text-muted",
          )}
        >
          <Pin className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={onTrash}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:text-error cursor-pointer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

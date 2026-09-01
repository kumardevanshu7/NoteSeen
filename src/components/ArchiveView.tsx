import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CheckSquare,
  FileText,
  LayoutGrid,
  List,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyButton } from "@/components/CopyButton";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import { archivedNotes, noteLabel, notesForWorkspace, searchNotes } from "@/lib/selectors";
import { cn, excerpt, formatRelative } from "@/lib/utils";

type KindFilter = "all" | "note" | "prompt";
type ViewMode = "grid" | "list";

const COLUMN_CHOICES = [2, 3, 4, 5, 6] as const;
const PREFS_KEY = "noteseen.archive-prefs";

interface ArchivePrefs {
  kind: KindFilter;
  view: ViewMode;
  cols: number;
}

function readPrefs(): ArchivePrefs {
  const fallback: ArchivePrefs = { kind: "all", view: "grid", cols: 3 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ArchivePrefs>;
    return {
      kind: parsed.kind === "note" || parsed.kind === "prompt" ? parsed.kind : "all",
      view: parsed.view === "list" ? "list" : "grid",
      cols: COLUMN_CHOICES.includes(parsed.cols as (typeof COLUMN_CHOICES)[number])
        ? (parsed.cols as number)
        : 3,
    };
  } catch {
    return fallback;
  }
}

export function ArchiveView() {
  const notes = useNotes((state) => state.notes);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const query = useNotes((state) => state.query);
  const setActive = useNotes((state) => state.setActive);
  const setView = useNotes((state) => state.setView);
  const unarchiveNotes = useNotes((state) => state.unarchiveNotes);
  const trashNotes = useNotes((state) => state.trashNotes);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ArchivePrefs>(readPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const scopedNotes = useMemo(
    () => notesForWorkspace(notes, activeWorkspaceId),
    [notes, activeWorkspaceId],
  );

  const allArchived = useMemo(() => archivedNotes(scopedNotes), [scopedNotes]);

  const counts = useMemo(
    () => ({
      all: allArchived.length,
      note: allArchived.filter((note) => note.kind !== "prompt").length,
      prompt: allArchived.filter((note) => note.kind === "prompt").length,
    }),
    [allArchived],
  );

  const allLabels = useMemo(() => {
    const set = new Map<string, string>();
    for (const note of allArchived) {
      for (const tag of note.tags) {
        const key = tag.toLowerCase();
        if (!set.has(key)) set.set(key, tag);
      }
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [allArchived]);

  const visible = useMemo(() => {
    let list = searchNotes(allArchived, query);
    if (prefs.kind === "note") list = list.filter((note) => note.kind !== "prompt");
    if (prefs.kind === "prompt") list = list.filter((note) => note.kind === "prompt");
    if (labelFilter) {
      const needle = labelFilter.toLowerCase();
      list = list.filter((note) => note.tags.some((tag) => tag.toLowerCase() === needle));
    }
    return list;
  }, [allArchived, query, labelFilter, prefs.kind]);

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

  const handleBulkUnarchive = () => {
    if (selectedIds.length === 0) return;
    unarchiveNotes(selectedIds);
    setSelected({});
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    void trashNotes(selectedIds).then((ok) => {
      if (ok) setSelected({});
    });
  };

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-hairline/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="size-5 text-accent" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Archive Space
              </h1>
            </div>
            <p className="ns-caption mt-1.5 max-w-xl text-xs sm:text-sm text-body-muted leading-relaxed">
              Notes that you have 100% completed and archived. Safely preserved without cluttering your active workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {visible.length > 0 ? (
              <Button variant="outline" size="sm" onClick={selectAll}>
                {allSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                <span>{allSelected ? "Clear" : "Select all"}</span>
              </Button>
            ) : null}

            {selectedIds.length > 0 ? (
              <>
                <Button variant="outline" size="sm" onClick={handleBulkUnarchive} className="gap-1.5 text-accent">
                  <ArchiveRestore className="size-3.5" />
                  <span>Unarchive ({selectedIds.length})</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-error" onClick={handleBulkDelete}>
                  <Trash2 className="size-3.5" />
                  <span>Delete ({selectedIds.length})</span>
                </Button>
              </>
            ) : null}

            <span className="ns-mono inline-flex items-center rounded-full border border-hairline/80 bg-stone/60 px-3 py-1 text-xs text-muted">
              {visible.length} archived {visible.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
            {(
              [
                { id: "all", label: "All", icon: LayoutGrid },
                { id: "note", label: "Notes", icon: FileText },
                { id: "prompt", label: "Prompts", icon: Sparkles },
              ] as { id: KindFilter; label: string; icon: typeof FileText }[]
            ).map((tab) => {
              const active = prefs.kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPrefs((prev) => ({ ...prev, kind: tab.id }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-primary font-medium text-primary-ink"
                      : "text-slate hover:bg-stone hover:text-ink",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  <span>{tab.label}</span>
                  <span className="ns-micro text-muted">
                    {tab.id === "all" ? counts.all : tab.id === "note" ? counts.note : counts.prompt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {allLabels.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {labelFilter ? `Label: ${labelFilter}` : "All labels"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by label</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setLabelFilter(null)}>
                    All labels
                  </DropdownMenuItem>
                  {allLabels.map((tag) => (
                    <DropdownMenuItem key={tag} onClick={() => setLabelFilter(tag)}>
                      {tag}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <div className="flex items-center gap-1 rounded-full border border-hairline p-0.5">
              <Button
                variant={prefs.view === "grid" ? "soft" : "ghost"}
                size="icon-sm"
                onClick={() => setPrefs((prev) => ({ ...prev, view: "grid" }))}
                aria-label="Grid view"
              >
                <LayoutGrid />
              </Button>
              <Button
                variant={prefs.view === "list" ? "soft" : "ghost"}
                size="icon-sm"
                onClick={() => setPrefs((prev) => ({ ...prev, view: "list" }))}
                aria-label="List view"
              >
                <List />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {visible.length === 0 ? (
          <div className="mt-14 flex flex-col items-center text-center px-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-hairline bg-stone/60 text-muted shadow-xs">
              <Archive className="size-7" />
            </div>
            <p className="mt-4 text-base sm:text-lg font-semibold text-ink">
              {query || labelFilter ? "No matching archived notes." : "Archive space is empty."}
            </p>
            <p className="ns-caption mt-1.5 max-w-sm text-xs sm:text-sm text-body-muted leading-relaxed">
              {query || labelFilter
                ? "Try adjusting your search or filters."
                : "When you mark a note as 100% completed, put it here to keep your active notes focused."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6 h-9 rounded-full px-5 text-xs font-medium"
              onClick={() => setView("all")}
            >
              Go to My Notes
            </Button>
          </div>
        ) : prefs.view === "list" ? (
          <ul className="mt-6 divide-y divide-hairline/60 rounded-xl border border-hairline/80 bg-surface/60 overflow-hidden shadow-xs">
            {visible.map((note) => (
              <li
                key={note.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-stone/50",
                  selected[note.id] && "bg-stone/60",
                )}
              >
                <button
                  type="button"
                  aria-label={selected[note.id] ? "Deselect" : "Select"}
                  onClick={() => toggleOne(note.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-xs text-slate hover:bg-surface/70"
                >
                  {selected[note.id] ? (
                    <CheckSquare className="size-4 text-ink" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActive(note.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-ink">
                      {noteLabel(note)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      <span>100% Covered</span>
                    </span>
                  </div>
                  <span className="ns-caption block truncate text-body-muted text-xs mt-0.5">
                    {excerpt(note.text, 90) || "Empty note"}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs text-accent"
                    onClick={() => unarchiveNotes([note.id])}
                  >
                    <ArchiveRestore className="size-3.5" />
                    <span className="hidden sm:inline">Unarchive</span>
                  </Button>
                  <CopyButton note={note} size="icon-sm" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted hover:text-error"
                    onClick={() => void trashNotes([note.id])}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 w-full min-w-0">
            {visible.map((note) => {
              const theme = NOTE_THEMES.find((option) => option.id === note.theme) ?? NOTE_THEMES[0];
              const isSel = Boolean(selected[note.id]);

              return (
                <li key={note.id} className="min-w-0 w-full">
                  <div
                    className={cn(
                      "group flex min-h-[14rem] w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5 shadow-xs",
                      isSel && "ring-2 ring-primary ring-offset-2 ring-offset-canvas",
                    )}
                    style={{ background: theme.wash, borderColor: theme.line }}
                  >
                    <div className="min-w-0 w-full">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label={isSel ? "Deselect" : "Select"}
                          onClick={() => toggleOne(note.id)}
                          className="flex size-7 items-center justify-center rounded-xs text-slate hover:bg-surface/70"
                        >
                          {isSel ? (
                            <CheckSquare className="size-4 text-ink" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>

                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          <span>100% Covered</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActive(note.id)}
                        className="w-full min-w-0 text-left focus:outline-none cursor-pointer"
                      >
                        <span className="line-clamp-2 block break-words [overflow-wrap:anywhere] text-[15px] sm:text-[16px] font-semibold text-ink leading-snug">
                          {noteLabel(note)}
                        </span>
                        <span className="ns-caption mt-2 line-clamp-3 block break-words [overflow-wrap:anywhere] text-xs sm:text-[13px] text-body-muted leading-relaxed">
                          {excerpt(note.text, 140) || "Empty note"}
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline/40 pt-3">
                      <span className="ns-mono text-[11px] text-muted">
                        {note.archivedAt ? `Archived ${formatRelative(note.archivedAt)}` : formatRelative(note.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium text-accent"
                          onClick={() => unarchiveNotes([note.id])}
                          title="Restore note to active notes"
                        >
                          <ArchiveRestore className="size-3.5" />
                          <span>Restore</span>
                        </Button>
                        <CopyButton note={note} size="icon-sm" />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 text-muted hover:text-error"
                          onClick={() => void trashNotes([note.id])}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

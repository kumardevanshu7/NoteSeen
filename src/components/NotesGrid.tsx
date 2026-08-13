import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckSquare,
  Columns3,
  FileText,
  LayoutGrid,
  List,
  Pin,
  Plus,
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
import { NewItemDialog } from "@/components/NewItemDialog";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import { liveNotes, noteLabel, searchNotes } from "@/lib/selectors";
import type { Note, NoteKind } from "@/lib/types";
import { cn, excerpt, formatRelative } from "@/lib/utils";

type KindFilter = "all" | "note" | "prompt";
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
    const onResize = () => setCeiling(columnCeiling(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return ceiling;
}

export function NotesGrid() {
  const notes = useNotes((state) => state.notes);
  const query = useNotes((state) => state.query);
  const setActive = useNotes((state) => state.setActive);
  const createItem = useNotes((state) => state.createItem);
  const togglePin = useNotes((state) => state.togglePin);
  const trashNotes = useNotes((state) => state.trashNotes);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
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

  const allLive = useMemo(
    () => liveNotes(notes).filter((note) => note.kind !== "promptCard"),
    [notes],
  );

  const counts = useMemo(
    () => ({
      all: allLive.length,
      note: allLive.filter((note) => note.kind !== "prompt").length,
      prompt: allLive.filter((note) => note.kind === "prompt").length,
    }),
    [allLive],
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

  const visible = useMemo(() => {
    let list = searchNotes(allLive, query);
    if (prefs.kind === "note") list = list.filter((note) => note.kind !== "prompt");
    if (prefs.kind === "prompt") list = list.filter((note) => note.kind === "prompt");
    if (labelFilter) {
      const needle = labelFilter.toLowerCase();
      list = list.filter((note) => note.tags.some((tag) => tag.toLowerCase() === needle));
    }
    return list;
  }, [allLive, query, labelFilter, prefs.kind]);

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
    createItem(kind);
  };

  const heading =
    prefs.kind === "note" ? "My Notes" : prefs.kind === "prompt" ? "My Prompts" : "Everything";

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className={cn("mx-auto", effectiveCols >= 4 ? "max-w-[110rem]" : "max-w-5xl")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">{heading}</h1>
            <p className="ns-caption mt-2 text-body-muted">
              {visible.length} {visible.length === 1 ? "item" : "items"}
              {labelFilter ? ` labeled “${labelFilter}”` : ""}
              {query ? ` matching “${query}”` : labelFilter ? "" : " on this device"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {visible.length > 0 ? (
              <Button variant="outline" size="sm" onClick={selectAll}>
                {allSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                {allSelected ? "Clear" : "Select all"}
              </Button>
            ) : null}
            {selectedIds.length > 0 ? (
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
            ) : null}
            <Button variant="primary" size="sm" className="gap-1.5 pl-3" onClick={() => setChooserOpen(true)}>
              <Plus className="size-3.5" />
              New
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
                  {tab.label}
                  <span className={cn("ns-mono", active ? "text-primary-ink/70" : "text-muted")}>
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

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
                      "flex size-8 items-center justify-center rounded-full transition-colors",
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
        </div>

        {allLabels.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="ns-mono text-muted">Labels</span>
            <button
              type="button"
              onClick={() => setLabelFilter(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] transition-colors",
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
                    "rounded-full border px-3 py-1 text-[12px] transition-colors",
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

        {visible.length === 0 ? (
          <div className="mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center">
            <FileText className="mx-auto size-5 text-muted" />
            <p className="ns-feature mt-4 text-ink">
              {query || labelFilter || prefs.kind !== "all"
                ? "Nothing matches that filter"
                : "Nothing here yet"}
            </p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              Create a note or a prompt. Add labels on notes to filter them here.
            </p>
          </div>
        ) : prefs.view === "list" ? (
          <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
            {visible.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                selected={Boolean(selected[note.id])}
                onToggleSelect={() => toggleOne(note.id)}
                onOpen={() => setActive(note.id)}
                onTogglePin={() => togglePin(note.id)}
                onTrash={() => void trashNotes([note.id])}
              />
            ))}
          </ul>
        ) : (
          <ul
            className="mt-8 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}
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
                onTrash={() => void trashNotes([note.id])}
              />
            ))}
          </ul>
        )}

        <p className="ns-micro mt-14 flex items-center justify-center gap-2 text-muted">
          <img src="/noteseen-mark.png?v=2" alt="" className="size-4 object-contain" />
          Arigato Labs
        </p>
      </div>

      <NewItemDialog open={chooserOpen} onOpenChange={setChooserOpen} onChoose={onChoose} />
    </div>
  );
}

interface ItemProps {
  note: Note;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
  onTrash: () => void;
}

function NoteCard({ note, compact, selected, onToggleSelect, onOpen, onTogglePin, onTrash }: ItemProps & { compact: boolean }) {
  const theme = NOTE_THEMES.find((option) => option.id === note.theme) ?? NOTE_THEMES[0];

  return (
    <li>
      <div
        className={cn(
          "group flex flex-col overflow-hidden rounded-sm border transition-transform hover:-translate-y-0.5",
          compact ? "h-44 p-3" : "h-56 p-4",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-canvas",
        )}
        style={{ background: theme.wash, borderColor: theme.line }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={selected ? "Deselect" : "Select"}
            onClick={onToggleSelect}
            className="flex size-7 items-center justify-center rounded-xs text-slate hover:bg-surface/70"
          >
            {selected ? <CheckSquare className="size-4 text-ink" /> : <Square className="size-4" />}
          </button>
          <span className="ns-mono flex items-center gap-1 text-muted">
            {note.kind === "prompt" ? <Sparkles className="size-3" /> : <FileText className="size-3" />}
            {compact ? null : note.kind}
          </span>
        </div>

        <button type="button" onClick={onOpen} className="min-h-0 flex-1 overflow-hidden text-left">
          <span
            className={cn(
              "line-clamp-2 block font-medium text-ink",
              compact ? "text-[13.5px]" : "text-[15px]",
            )}
          >
            {noteLabel(note)}
          </span>
          <span
            className={cn(
              "ns-caption mt-2 block text-body-muted",
              compact ? "line-clamp-2" : note.tags.length > 0 ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {excerpt(note.text, compact ? 80 : 140) ||
              (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
          </span>
        </button>

        <div className="mt-auto shrink-0 space-y-2 pt-2">
          {note.tags.length > 0 && !compact ? (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-full border border-hairline bg-surface/70 px-2 py-px text-[11px] text-slate"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="ns-mono shrink-0 text-muted">{formatRelative(note.updatedAt)}</span>
            <div className="flex items-center gap-0.5">
              <CopyButton note={note} size="icon-sm" />
              <button
                type="button"
                aria-label={note.pinned ? "Unpin" : "Pin"}
                onClick={onTogglePin}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  note.pinned ? "text-coral" : "text-muted",
                )}
              >
                <Pin className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={onTrash}
                className="flex size-7 items-center justify-center rounded-full text-muted hover:text-error"
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

function NoteRow({ note, selected, onToggleSelect, onOpen, onTogglePin, onTrash }: ItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-2 py-3 transition-colors hover:bg-stone/50",
        selected && "bg-stone/60",
      )}
    >
      <button
        type="button"
        aria-label={selected ? "Deselect" : "Select"}
        onClick={onToggleSelect}
        className="flex size-7 shrink-0 items-center justify-center rounded-xs text-slate hover:bg-surface/70"
      >
        {selected ? <CheckSquare className="size-4 text-ink" /> : <Square className="size-4" />}
      </button>

      {note.kind === "prompt" ? (
        <Sparkles className="size-3.5 shrink-0 text-slate" />
      ) : (
        <FileText className="size-3.5 shrink-0 text-slate" />
      )}

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[14px] font-medium text-ink">{noteLabel(note)}</span>
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
        <CopyButton note={note} size="icon-sm" />
        <button
          type="button"
          aria-label={note.pinned ? "Unpin" : "Pin"}
          onClick={onTogglePin}
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
            note.pinned ? "text-coral" : "text-muted",
          )}
        >
          <Pin className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={onTrash}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:text-error"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

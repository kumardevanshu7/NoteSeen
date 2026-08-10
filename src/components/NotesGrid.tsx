import { useMemo, useState } from "react";
import { CheckSquare, FileText, Pin, Plus, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { NewItemDialog } from "@/components/NewItemDialog";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import { liveNotes, noteLabel, searchNotes } from "@/lib/selectors";
import type { NoteKind } from "@/lib/types";
import { cn, excerpt, formatRelative } from "@/lib/utils";

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

  const allLive = useMemo(() => liveNotes(notes), [notes]);
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
    if (labelFilter) {
      const needle = labelFilter.toLowerCase();
      list = list.filter((note) => note.tags.some((tag) => tag.toLowerCase() === needle));
    }
    return list;
  }, [allLive, query, labelFilter]);

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

  return (
    <div className="ns-scroll flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">My Notes</h1>
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

        {allLabels.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-2">
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
              {query || labelFilter ? "No notes match that filter" : "Nothing here yet"}
            </p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              Create a note or a prompt. Add labels on notes to filter them here.
            </p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((note) => {
              const theme = NOTE_THEMES.find((option) => option.id === note.theme) ?? NOTE_THEMES[0];
              const isSelected = Boolean(selected[note.id]);
              return (
                <li key={note.id}>
                  <div
                    className={cn(
                      "group flex h-56 flex-col rounded-sm border p-4 transition-transform hover:-translate-y-0.5",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-canvas",
                    )}
                    style={{ background: theme.wash, borderColor: theme.line }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        aria-label={isSelected ? "Deselect" : "Select"}
                        onClick={() => toggleOne(note.id)}
                        className="flex size-7 items-center justify-center rounded-xs text-slate hover:bg-surface/70"
                      >
                        {isSelected ? <CheckSquare className="size-4 text-ink" /> : <Square className="size-4" />}
                      </button>
                      <span className="ns-mono flex items-center gap-1 text-muted">
                        {note.kind === "prompt" ? <Sparkles className="size-3" /> : <FileText className="size-3" />}
                        {note.kind}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActive(note.id)}
                      className="min-h-0 flex-1 text-left"
                    >
                      <span className="line-clamp-2 block text-[15px] font-medium text-ink">
                        {noteLabel(note)}
                      </span>
                      <span className="ns-caption mt-2 line-clamp-3 block text-body-muted">
                        {excerpt(note.text, 140) || (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
                      </span>
                      {note.tags.length > 0 ? (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-hairline bg-surface/70 px-2 py-px text-[11px] text-slate"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </button>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="ns-mono text-muted">{formatRelative(note.updatedAt)}</span>
                      <div className="flex items-center gap-0.5">
                        <CopyButton note={note} size="icon-sm" />
                        <button
                          type="button"
                          aria-label={note.pinned ? "Unpin" : "Pin"}
                          onClick={() => togglePin(note.id)}
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
                          onClick={() => void trashNotes([note.id])}
                          className="flex size-7 items-center justify-center rounded-full text-muted hover:text-error"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="ns-micro mt-14 flex items-center justify-center gap-2 text-muted">
          <img src="/android-chrome-192x192.png" alt="" className="size-4 rounded-xs" />
          Arigato Labs
        </p>
      </div>

      <NewItemDialog open={chooserOpen} onOpenChange={setChooserOpen} onChoose={onChoose} />
    </div>
  );
}

import { Sparkles, X } from "lucide-react";
import { useNotes } from "@/store/notes";
import { noteLabel } from "@/lib/selectors";
import { cn } from "@/lib/utils";

export function NoteTabs() {
  const notes = useNotes((state) => state.notes);
  const openTabs = useNotes((state) => state.openTabs);
  const activeId = useNotes((state) => state.activeId);
  const view = useNotes((state) => state.view);
  const setActive = useNotes((state) => state.setActive);
  const closeTab = useNotes((state) => state.closeTab);

  const tabs = openTabs
    .map((id) => notes[id])
    .filter(
      (note): note is NonNullable<typeof note> =>
        Boolean(note) && !note.deletedAt && note.kind !== "promptCard",
    );

  if (tabs.length === 0) return null;

  return (
    <div
      className="ns-no-print ns-scroll flex h-9 shrink-0 items-end gap-px overflow-x-auto border-b border-hairline bg-canvas px-1.5"
      onWheel={(event) => {
        if (event.deltaY === 0 || event.shiftKey) return;
        event.currentTarget.scrollLeft += event.deltaY;
      }}
      role="tablist"
      aria-label="Open notes"
    >
      {tabs.map((note) => {
        const active = note.id === activeId && view === "editor";
        return (
          <div
            key={note.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            title={noteLabel(note)}
            onClick={() => setActive(note.id)}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                closeTab(note.id);
              }
            }}
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActive(note.id);
              }
            }}
            className={cn(
              "group relative mb-[-1px] flex h-8 max-w-[13.5rem] min-w-[7.5rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-left transition-colors",
              active
                ? "border-hairline bg-surface text-ink"
                : "border-transparent text-body-muted hover:bg-stone/55 hover:text-ink",
            )}
          >
            {note.kind === "prompt" ? (
              <Sparkles className="size-3 shrink-0 text-slate" />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{noteLabel(note)}</span>
            <button
              type="button"
              aria-label={`Close ${noteLabel(note)}`}
              onClick={(event) => {
                event.stopPropagation();
                closeTab(note.id);
              }}
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-sm text-muted transition-opacity hover:bg-stone hover:text-ink",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

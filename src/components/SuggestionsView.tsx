import { useMemo } from "react";
import { FileText, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import {
  inactiveNotes,
  noteLabel,
  notesForWorkspace,
  quietDays,
  searchNotes,
  suggestionTheme,
} from "@/lib/selectors";
import { excerpt } from "@/lib/utils";

export function SuggestionsView() {
  const notes = useNotes((state) => state.notes);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const query = useNotes((state) => state.query);
  const setActive = useNotes((state) => state.setActive);
  const setView = useNotes((state) => state.setView);

  const quiet = useMemo(
    () => inactiveNotes(notesForWorkspace(notes, activeWorkspaceId)),
    [notes, activeWorkspaceId],
  );
  const visible = useMemo(() => searchNotes(quiet, query), [quiet, query]);

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 border-b border-hairline/60 pb-5 sm:pb-6">
          <div>
            <p className="ns-mono text-[11px] font-semibold uppercase tracking-wider text-muted">Home</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">Suggestions</h1>
            <p className="ns-caption mt-1.5 max-w-xl text-xs sm:text-sm text-body-muted leading-relaxed">
              Notes and prompts untouched for a week or more. Each gets a distinct color accent so quiet items stand out.
            </p>
          </div>
          <span className="ns-mono self-start sm:self-auto inline-flex items-center rounded-full border border-hairline/80 bg-stone/60 px-3 py-1 text-xs text-muted">
            {visible.length} quiet {visible.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Content */}
        {visible.length === 0 ? (
          <div className="mt-12 sm:mt-20 flex flex-col items-center text-center px-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-hairline bg-stone/60 text-muted shadow-xs">
              <Lightbulb className="size-7" />
            </div>
            <p className="mt-4 text-base sm:text-lg font-semibold text-ink">
              {query ? "Nothing matches." : "Nothing’s gone quiet yet."}
            </p>
            <p className="ns-caption mt-1.5 max-w-sm text-xs sm:text-sm text-body-muted leading-relaxed">
              {query
                ? "Try a different search query."
                : "After seven days without opening or editing, a note automatically shows up here."}
            </p>
            {!query ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-6 h-9 sm:h-10 rounded-full px-5 text-xs sm:text-sm font-medium shadow-xs"
                onClick={() => setView("all")}
              >
                Go to My Notes
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-6 sm:mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {visible.map((note) => {
              const themeId = suggestionTheme(note);
              const theme = NOTE_THEMES.find((option) => option.id === themeId) ?? NOTE_THEMES[1];
              const days = quietDays(note);
              return (
                <li key={note.id}>
                  <div
                    className="group flex min-h-[13.5rem] sm:min-h-[14rem] flex-col justify-between overflow-hidden rounded-xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5 active:scale-[0.99] shadow-xs"
                    style={{ background: theme.wash, borderColor: theme.line }}
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <span className="ns-mono flex items-center gap-1.5 text-xs text-muted">
                          {note.kind === "prompt" ? (
                            <Sparkles className="size-3.5" />
                          ) : (
                            <FileText className="size-3.5" />
                          )}
                          <span className="capitalize">{note.kind}</span>
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                          style={{
                            color: theme.ink,
                            background: "color-mix(in oklab, var(--surface) 65%, transparent)",
                          }}
                        >
                          {days}d quiet
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActive(note.id)}
                        className="w-full text-left focus:outline-none"
                      >
                        <span className="line-clamp-2 block text-[15px] sm:text-[16px] font-semibold text-ink leading-snug">
                          {noteLabel(note)}
                        </span>
                        <span className="ns-caption mt-2 line-clamp-3 block text-xs sm:text-[13px] text-body-muted leading-relaxed">
                          {excerpt(note.text, 140) ||
                            (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline/40 pt-3">
                      <CopyButton note={note} size="icon-sm" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-3 text-xs font-medium"
                        onClick={() => setActive(note.id)}
                      >
                        Open
                      </Button>
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
